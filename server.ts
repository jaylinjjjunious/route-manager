import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import crypto from "crypto";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// Load environment variables
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3001);
const REQUIRED_SHOWER_BARCODE = "075371003233";
const showerProofRoot = path.join(process.cwd(), ".local-shower-proofs");
const showerProofImageRoot = path.join(showerProofRoot, "images");
const showerProofMetadataPath = path.join(showerProofRoot, "proofs.json");

interface LocalShowerProofRecord {
  id: string;
  cycleId: string;
  localDate: string;
  barcode: string;
  barcodeEnding: string;
  capturedAt: string;
  storageKey: string;
  imageUrl: string;
  uploadStatus: "saved";
  verificationStatus: "verified";
  createdAt: string;
  updatedAt: string;
}

interface MultipartPart {
  name: string;
  filename?: string;
  contentType?: string;
  data: Buffer;
}

const readLocalShowerProofs = async (): Promise<LocalShowerProofRecord[]> => {
  try {
    const text = await fs.readFile(showerProofMetadataPath, "utf8");
    const records = JSON.parse(text) as LocalShowerProofRecord[];
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
};

const writeLocalShowerProofs = async (records: LocalShowerProofRecord[]) => {
  await fs.mkdir(showerProofRoot, { recursive: true });
  await fs.writeFile(showerProofMetadataPath, JSON.stringify(records, null, 2));
};

const normalizeLocalCycleId = (value: unknown) => {
  const key = (value || "").toString().trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : new Date().toISOString().slice(0, 10);
};

const parseMultipartBuffer = (body: Buffer, contentType: string): MultipartPart[] => {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  const boundary = boundaryMatch?.[1] || boundaryMatch?.[2];
  if (!boundary) return [];
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const parts: MultipartPart[] = [];
  let cursor = body.indexOf(boundaryBuffer);

  while (cursor !== -1) {
    const nextCursor = body.indexOf(boundaryBuffer, cursor + boundaryBuffer.length);
    if (nextCursor === -1) break;
    const rawPart = body.subarray(cursor + boundaryBuffer.length, nextCursor);
    cursor = nextCursor;
    if (rawPart.length < 6) continue;
    const part = rawPart.subarray(rawPart[0] === 13 && rawPart[1] === 10 ? 2 : 0);
    const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd === -1) continue;
    const headerText = part.subarray(0, headerEnd).toString("utf8");
    const disposition = headerText.match(/content-disposition:[^\n]*name="([^"]+)"(?:; filename="([^"]+)")?/i);
    if (!disposition) continue;
    let data = part.subarray(headerEnd + 4);
    if (data.length >= 2 && data[data.length - 2] === 13 && data[data.length - 1] === 10) {
      data = data.subarray(0, data.length - 2);
    }
    const contentTypeMatch = headerText.match(/content-type:\s*([^\r\n]+)/i);
    parts.push({
      name: disposition[1],
      filename: disposition[2],
      contentType: contentTypeMatch?.[1]?.trim(),
      data,
    });
  }

  return parts;
};

app.use("/shower-proof-assets", express.static(showerProofImageRoot, {
  setHeaders: (res) => res.setHeader("Cache-Control", "private, no-store"),
}));

// Body parser with 15MB limit for Base64 screenshot uploads
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Lazy initializer for Google GenAI to avoid crashing on startup if the API Key is not yet configured
let aiInstance: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in Settings > Secrets.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.get("/api/shower-proofs/current", async (req: Request, res: Response) => {
  const cycleId = normalizeLocalCycleId(req.query.cycleId);
  const proofs = await readLocalShowerProofs();
  const proof = proofs
    .filter(record => record.cycleId === cycleId && record.barcode === REQUIRED_SHOWER_BARCODE && record.uploadStatus === "saved" && record.verificationStatus === "verified")
    .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))[0] || null;
  res.json({ proof });
});

app.get("/api/shower-proofs/:id", async (req: Request, res: Response) => {
  const proofs = await readLocalShowerProofs();
  const proof = proofs.find(record => record.id === req.params.id) || null;
  res.json({ proof });
});

app.get("/api/shower-proofs", async (_req: Request, res: Response) => {
  const proofs = await readLocalShowerProofs();
  res.json({ proofs: proofs.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt)).slice(0, 50) });
});

app.post(
  "/api/shower-proofs",
  express.raw({ type: request => request.headers["content-type"]?.startsWith("multipart/form-data") === true, limit: "15mb" }),
  async (req: Request, res: Response) => {
    try {
      if (!Buffer.isBuffer(req.body)) {
        return res.status(400).json({ error: "Invalid proof upload." });
      }

      const parts = parseMultipartBuffer(req.body, req.headers["content-type"] || "");
      const getTextPart = (name: string) => parts.find(part => part.name === name)?.data.toString("utf8").trim() || "";
      const barcode = getTextPart("barcode");

      if (barcode !== REQUIRED_SHOWER_BARCODE) {
        return res.status(400).json({ error: "Incorrect product barcode." });
      }

      const image = parts.find(part => part.name === "image");
      if (!image || image.data.length === 0) {
        return res.status(400).json({ error: "Proof image is required." });
      }

      const cycleId = normalizeLocalCycleId(getTextPart("cycleId"));
      const localDate = normalizeLocalCycleId(getTextPart("localDate"));
      const capturedDate = new Date(getTextPart("capturedAt"));
      const capturedAt = Number.isNaN(capturedDate.getTime()) ? new Date().toISOString() : capturedDate.toISOString();
      const id = `shower-${cycleId}-${crypto.randomUUID()}`;
      const filename = `${id}.jpg`;
      const storageKey = `daily-shower-gate/${cycleId}/${filename}`;
      const now = new Date().toISOString();

      await fs.mkdir(showerProofImageRoot, { recursive: true });
      await fs.writeFile(path.join(showerProofImageRoot, filename), image.data);

      const proof: LocalShowerProofRecord = {
        id,
        cycleId,
        localDate,
        barcode,
        barcodeEnding: barcode.slice(-4),
        capturedAt,
        storageKey,
        imageUrl: `/shower-proof-assets/${filename}`,
        uploadStatus: "saved",
        verificationStatus: "verified",
        createdAt: now,
        updatedAt: now,
      };

      const proofs = await readLocalShowerProofs();
      await writeLocalShowerProofs([proof, ...proofs.filter(record => record.id !== proof.id)].slice(0, 200));
      res.json({ proof });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Proof record save failed." });
    }
  }
);

// AI Dispatcher Chat Endpoint
app.post("/api/dispatcher/chat", async (req: any, res: any) => {
  try {
    const { message, jobs, currentBattery } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Missing message in request body." });
    }

    let ai;
    try {
      ai = getGeminiClient();
    } catch (e: any) {
      return res.status(500).json({ 
        error: "Gemini client initialization failed.", 
        details: e.message 
      });
    }

    const systemPrompt = `You are the back-office AI Operations Manager & Dispatcher for a gig worker riding a Jasion EB5 e-bike.
Analyze the user's natural language command, match it against their active list of jobs, and determine the correct intent/action.

Current user jobs context:
${JSON.stringify(jobs || [], null, 2)}

Current e-bike battery level: ${currentBattery || 100}%

Choose the single most appropriate action from the list of intents:
1. COMPLETE_JOB: User says they completed or finished a store/job (e.g., "I completed Albertsons", "Done with Vons"). Identify the storeName or ID.
2. ADD_JOB: User wants to add a new job (e.g., "Add a new job at Vons on Ming", "Add Tractor Supply on white lane for $20"). Extract or infer details:
   - storeName: e.g. "Vons", "Tractor Supply"
   - address: e.g. "Ming Ave" or "White Ln"
   - pay: numeric value, e.g. 20.0
   - estimatedMinutes: average audit time if not given, default to 20
   - jobType: 'retail_audit', 'merchandising', 'mystery_shop', or 'field_task'. Choose the best match.
   - dueTime: e.g. "05:00 PM"
   - notes: any special instructions
3. EDIT_JOB: User wants to edit or update an existing job's details.
4. MOVE_TO_TOMORROW: User wants to postpone a job to tomorrow (e.g. "Move Tractor Supply to tomorrow").
5. MOVE_TO_ROUTE_B: User wants to shelf a job or push it to standby Route B (e.g. "Push BevMo to Route B", "Move Target to Standby").
6. UPDATE_BATTERY: User reports their current battery (e.g. "I'm on 60% battery", "Battery is 50 percent"). Extract the numeric value.
7. GET_NEXT_STOP: User asks about their next job (e.g., "What's my next job?", "Where am I heading next?").
8. GET_REMAINING_JOBS: User asks about how many jobs/stops are left (e.g. "How many jobs do I have left?").
9. REOPTIMIZE_ROUTE: User wants to re-optimize or re-sequence (e.g. "Re-optimize my route", "Optimize my schedule").
10. END_DAY_SUMMARY: User wants to finish for the day (e.g., "End the day", "Finish up", "Generate end of day summary"). This is a high-impact action: set requiresConfirmation to true.
11. NONE: For general conversations or off-topic messages.

Guidelines:
- Return a short, friendly conversational confirmation in 'response' (max 2 sentences) written in the tone of a professional operations manager.
- If the action requires user confirmation before taking effect (e.g. END_DAY_SUMMARY, or deleting/postponing a job if requested by user), set requiresConfirmation to true.
- If the user is asking "Can I finish today?" analyze the remaining miles, hours, and current battery level, and answer in the 'response' (e.g., "Based on your 60% battery and 4 remaining jobs, yes, you can finish today if you keep your assist level on PAS 2."). Set action.type to 'NONE'.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: message,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            response: {
              type: Type.STRING,
              description: "A short, friendly, conversational confirmation/answer in natural language as an AI Dispatcher operations manager. Maximum 2 sentences."
            },
            action: {
              type: Type.OBJECT,
              description: "The structured action to perform, if any. Otherwise, type should be 'NONE'.",
              properties: {
                type: {
                  type: Type.STRING,
                  description: "Must be exactly one of: 'COMPLETE_JOB', 'ADD_JOB', 'EDIT_JOB', 'MOVE_TO_TOMORROW', 'MOVE_TO_ROUTE_B', 'UPDATE_BATTERY', 'GET_NEXT_STOP', 'GET_REMAINING_JOBS', 'REOPTIMIZE_ROUTE', 'END_DAY_SUMMARY', 'NONE'."
                },
                jobTarget: {
                  type: Type.STRING,
                  description: "A string representing the name/store or ID of the job being targeted (e.g. 'Albertsons', 'Tractor Supply', 'BevMo'). Match what is mentioned in user input."
                },
                jobData: {
                  type: Type.OBJECT,
                  description: "If adding or editing a job, provide the structured details.",
                  properties: {
                    storeName: { type: Type.STRING, description: "Name of the store (e.g., Vons, Albertsons, Tractor Supply)." },
                    address: { type: Type.STRING, description: "Full address if provided or inferred (e.g., 9000 Ming Ave, 1951 Golden State Ave)." },
                    pay: { type: Type.NUMBER, description: "Payout amount in dollars (e.g., 18.00)." },
                    estimatedMinutes: { type: Type.INTEGER, description: "Inferred store work time (e.g., 20 or 30 minutes)." },
                    jobType: { type: Type.STRING, description: "Must be exactly one of: 'retail_audit', 'merchandising', 'mystery_shop', 'field_task'." },
                    dueTime: { type: Type.STRING, description: "Due limit if any (e.g. '05:00 PM')." },
                    notes: { type: Type.STRING, description: "Any special instructions or notes." }
                  }
                },
                batteryValue: {
                  type: Type.INTEGER,
                  description: "The battery percentage if user is reporting their battery (e.g. 60)."
                },
                requiresConfirmation: {
                  type: Type.BOOLEAN,
                  description: "True if this is a high-impact action that should ask the user to confirm first (e.g., ending the day, or deleting/postponing a critical job)."
                }
              },
              required: ["type"]
            }
          },
          required: ["response", "action"]
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) {
      return res.status(500).json({ error: "No response text from Gemini dispatcher." });
    }

    const parsedData = JSON.parse(textOutput.trim());
    return res.json(parsedData);

  } catch (error: any) {
    console.error("AI Dispatcher chat error:", error);
    return res.status(500).json({ 
      error: "Failed to process dispatcher command.", 
      details: error.message 
    });
  }
});

// Helper to wrap raw 16-bit PCM at 24kHz in a standard WAV header
function pcmToWav(pcmBuffer: Buffer, sampleRate: number = 24000): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  
  const wavHeader = Buffer.alloc(44);
  
  wavHeader.write("RIFF", 0);
  wavHeader.writeUInt32LE(36 + pcmBuffer.length, 4);
  wavHeader.write("WAVE", 8);
  wavHeader.write("fmt ", 12);
  wavHeader.writeUInt32LE(16, 16);
  wavHeader.writeUInt16LE(1, 20);
  wavHeader.writeUInt16LE(numChannels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(byteRate, 28);
  wavHeader.writeUInt16LE(blockAlign, 32);
  wavHeader.writeUInt16LE(bitsPerSample, 34);
  wavHeader.write("data", 36);
  wavHeader.writeUInt32LE(pcmBuffer.length, 40);
  
  return Buffer.concat([wavHeader, pcmBuffer]);
}

// AI Dispatcher Real AI Text-to-Speech API
app.post("/api/dispatcher/tts", async (req: any, res: any) => {
  try {
    const { text, engine, style } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Missing text to speak." });
    }

    const ttsEngine = engine || "gemini_tts";
    const ttsStyle = style || "calm";

    if (ttsEngine === "gemini_tts") {
      let ai;
      try {
        ai = getGeminiClient();
      } catch (e: any) {
        return res.status(400).json({ 
          error: "MISSING_KEY", 
          provider: "Gemini", 
          message: "Realistic voice requires an API key. Browser voice is being used as fallback." 
        });
      }

      // Map voice styles to Gemini prebuilt voices: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
      let geminiVoiceName = "Kore"; // default calm/natural
      if (ttsStyle === "professional") {
        geminiVoiceName = "Charon";
      } else if (ttsStyle === "friendly") {
        geminiVoiceName = "Zephyr";
      } else if (ttsStyle === "fast") {
        geminiVoiceName = "Fenrir";
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: geminiVoiceName },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        throw new Error("Failed to generate audio content from Gemini TTS API.");
      }

      // Gemini TTS returns raw 24kHz PCM. Convert to playable WAV.
      const pcmBuffer = Buffer.from(base64Audio, "base64");
      const wavBuffer = pcmToWav(pcmBuffer, 24000);
      const base64Wav = wavBuffer.toString("base64");

      return res.json({
        audio: base64Wav,
        mimeType: "audio/wav"
      });

    } else if (ttsEngine === "openai_tts") {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ 
          error: "MISSING_KEY", 
          provider: "OpenAI", 
          message: "Realistic voice requires an API key. Browser voice is being used as fallback." 
        });
      }

      // Map voice styles to OpenAI voices: 'alloy', 'echo', 'onyx', 'fable', 'nova', 'shimmer'
      let openAIVoice = "alloy"; // default calm/natural
      if (ttsStyle === "professional") {
        openAIVoice = "onyx";
      } else if (ttsStyle === "friendly") {
        openAIVoice = "nova";
      } else if (ttsStyle === "fast") {
        openAIVoice = "shimmer";
      }

      const openAIResponse = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-1",
          input: text,
          voice: openAIVoice,
        }),
      });

      if (!openAIResponse.ok) {
        const errText = await openAIResponse.text();
        throw new Error(`OpenAI TTS API failed: ${errText}`);
      }

      const arrayBuffer = await openAIResponse.arrayBuffer();
      const base64Audio = Buffer.from(arrayBuffer).toString("base64");

      return res.json({
        audio: base64Audio,
        mimeType: "audio/mpeg"
      });

    } else if (ttsEngine === "elevenlabs") {
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ 
          error: "MISSING_KEY", 
          provider: "ElevenLabs", 
          message: "Realistic voice requires an API key. Browser voice is being used as fallback." 
        });
      }

      // Map styles to prebuilt ElevenLabs voices
      let voiceId = "21m00Tcm4TlvDq8ikWAM"; // Rachel - calm female
      if (ttsStyle === "professional") {
        voiceId = "AZnzlk1XvdvUeBnXmlld"; // Domi
      } else if (ttsStyle === "friendly") {
        voiceId = "pNInz6obpg7p7p48I31f"; // Adam
      } else if (ttsStyle === "fast") {
        voiceId = "TX3LPaxu3N0v50eVOgEP"; // Liam
      }

      const elevenResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          }
        }),
      });

      if (!elevenResponse.ok) {
        const errText = await elevenResponse.text();
        throw new Error(`ElevenLabs TTS API failed: ${errText}`);
      }

      const arrayBuffer = await elevenResponse.arrayBuffer();
      const base64Audio = Buffer.from(arrayBuffer).toString("base64");

      return res.json({
        audio: base64Audio,
        mimeType: "audio/mpeg"
      });

    } else {
      return res.status(400).json({ error: `Unsupported voice engine: ${ttsEngine}` });
    }

  } catch (error: any) {
    console.error("AI TTS API error:", error);
    return res.status(500).json({ 
      error: "API_FAIL", 
      message: "The AI Voice generation failed. Browser voice is being used as fallback.",
      details: error.message 
    });
  }
});

// Privacy-First Screenshot OCR Import API
app.post("/api/import/ocr", async (req: any, res: any) => {
  try {
    const { image, mimeType } = req.body;

    if (!image) {
      return res.status(400).json({ error: "Missing image data in request body." });
    }

    // Clean base64 data to remove potential prefixes
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    // Initialize Gemini client
    let ai;
    try {
      ai = getGeminiClient();
    } catch (e: any) {
      return res.status(500).json({ 
        error: "Gemini client initialization failed.", 
        details: e.message 
      });
    }

    const systemPrompt = `You are an expert gig-worker assistant and screenshot parsing engine. 
Analyze the screenshot of a gig/delivery/field job (e.g., from DoorDash, UberEats, Grubhub, Instacart, Field Agent, Gigwalk, etc.) 
and extract key details for the route optimizer.

IMPORTANT PRIVACY GUIDELINES:
- Extract ONLY the details requested in the schema.
- Do NOT extract or return any customer names, phone numbers, or driver logins/identifications.
- If specific values are missing, infer the best fallback based on context (e.g. 20 minutes for average audit, 15 minutes for retail pick-up).
- Pick the most logical jobType among: 'retail_audit', 'merchandising', 'mystery_shop', 'field_task'.
- Identify and extract revisionStatus (e.g. 'Needs Revision', 'Approved', 'Draft', 'Submitted', 'Pending') only if clearly visible. Otherwise, return 'None'.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType || "image/png",
            data: base64Data,
          },
        },
        {
          text: "Parse this gig screenshot and provide the structured job information."
        }
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            storeName: { type: Type.STRING, description: "The store name, restaurant, or job location, e.g. Target, Walmart, McDonald's." },
            address: { type: Type.STRING, description: "Street address or closest landmark of the job. Be as precise as possible." },
            pay: { type: Type.NUMBER, description: "Payout for the job in dollars, e.g. 15.50. Float number." },
            estimatedMinutes: { type: Type.INTEGER, description: "Estimated minutes to complete the work inside the store. Default to 20 if unknown." },
            jobType: { 
              type: Type.STRING, 
              description: "Must be exactly one of: 'retail_audit', 'merchandising', 'mystery_shop', 'field_task'." 
            },
            dueTime: { type: Type.STRING, description: "Due time in standard readable text, e.g. '04:00 PM', '18:30'." },
            notes: { type: Type.STRING, description: "A brief summary of what task is required, items count, or specific instructions." },
            deadline: { type: Type.STRING, description: "The deadline description or delivery timeframe extracted from the screenshot, e.g. 'Deliver by 5:00 PM', 'Today by 6pm'." },
            revisionStatus: { type: Type.STRING, description: "The revision status if visible (e.g. 'Needs Revision', 'Approved', 'Draft', 'Submitted', 'Pending'). Return 'None' if not specified." }
          },
          required: ["storeName", "address", "pay", "estimatedMinutes", "jobType", "dueTime", "notes", "deadline", "revisionStatus"]
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) {
      return res.status(500).json({ error: "No text response received from Gemini OCR parser." });
    }

    const parsedData = JSON.parse(textOutput.trim());
    return res.json(parsedData);

  } catch (error: any) {
    console.error("OCR import endpoint error:", error);
    return res.status(500).json({ 
      error: "Failed to parse the screenshot with AI OCR.", 
      details: error.message 
    });
  }
});

// Setup Vite Dev server or static asset serving
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware loaded.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Serving static production build from dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  });
}

bootstrap().catch(err => {
  console.error("Failed to start server:", err);
});
