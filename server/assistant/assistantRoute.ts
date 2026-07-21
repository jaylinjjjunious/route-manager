import { Router } from "express";
import { GoogleGenAI, Type } from "@google/genai";
import { ASSISTANT_SYSTEM_INSTRUCTION } from "./systemInstructions";

interface AssistantRequestBody {
  message: string;
  context: Record<string, unknown>;
  history: Array<{ role: "user" | "assistant"; text: string }>;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }
  return new GoogleGenAI({ apiKey });
}

export function createAssistantRouter(requireAuth: any): Router {
  const router = Router();

  router.post("/chat", requireAuth, async (req: any, res: any) => {
    try {
      const { message, context, history } = req.body as AssistantRequestBody;

      if (!message) {
        return res.status(400).json({ error: "Missing message in request body." });
      }

      let ai: GoogleGenAI;
      try {
        ai = getGeminiClient();
      } catch (e: any) {
        return res.status(500).json({
          error: "AI client initialization failed.",
          details: e.message,
        });
      }

      const contextStr = JSON.stringify(context || {}, null, 2);
      const historyStr = (history || [])
        .map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.text}`)
        .join("\n");

      const systemPrompt = `${ASSISTANT_SYSTEM_INSTRUCTION}

## CURRENT APP CONTEXT
${contextStr}

## RECENT CONVERSATION HISTORY
${historyStr || "No prior conversation."}`;

      const geminiResponse = await ai.models.generateContent({
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
                description: "Your conversational reply to the user.",
              },
              toolCalls: {
                type: Type.ARRAY,
                description: "Optional array of tool calls to execute.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    tool: {
                      type: Type.STRING,
                      description: "The tool name to call.",
                    },
                    input: {
                      type: Type.OBJECT,
                      description: "Input parameters for the tool.",
                      properties: {},
                    },
                    confirmationText: {
                      type: Type.STRING,
                      description: "User-facing explanation if confirmation is needed.",
                    },
                  },
                  required: ["tool", "input"],
                },
              },
            },
            required: ["response"],
          },
        },
      });

      const textOutput = geminiResponse.text;
      if (!textOutput) {
        return res.status(500).json({ error: "No response text from AI." });
      }

      const parsedData = JSON.parse(textOutput.trim());
      return res.json(parsedData);
    } catch (error: any) {
      console.error("AI Assistant chat error:", error);
      return res.status(500).json({
        error: "Failed to process assistant request.",
        details: error.message,
      });
    }
  });

  return router;
}
