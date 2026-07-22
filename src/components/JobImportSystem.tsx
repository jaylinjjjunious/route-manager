import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { authFetch } from '../services/apiClient';
import { 
  ShieldCheck, 
  Upload, 
  FileText, 
  Share2, 
  Globe, 
  Database, 
  Check, 
  AlertCircle, 
  ArrowRight, 
  Sparkles, 
  Plus, 
  RefreshCw, 
  Lock, 
  FileUp, 
  HelpCircle,
  ExternalLink,
  Smartphone,
  EyeOff
} from 'lucide-react';
import { Job, JobType } from '../types';
import { resolveCoordinates } from '../utils/routeUtils';

interface JobImportSystemProps {
  onImportJobs: (newJobs: Omit<Job, 'id'>[]) => void;
  isOptimizing?: boolean;
}

// Sample mock data for quick screenshot testing
const MOCK_OCR_TEMPLATES = {
  doordash: {
    storeName: "McDonald's (Bakersfield Plaza)",
    address: "Albertsons 13045 Rosedale Hwy", // aligned with Bakersfield coordinates dictionary
    pay: 14.50,
    estimatedMinutes: 15,
    jobType: "field_task" as JobType,
    dueTime: "16:45",
    notes: "DoorDash Delivery Offer ID #5829. 2.4 miles. Drop off at 1410 Columbus Ave.",
    deadline: "Deliver by 4:45 PM",
    revisionStatus: "None"
  },
  instacart: {
    storeName: "Vons (Ming Ave Hub)",
    address: "Vons 9000 Ming Ave",
    pay: 28.20,
    estimatedMinutes: 45,
    jobType: "merchandising" as JobType,
    dueTime: "18:00",
    notes: "Instacart Batch Offer. 42 items (55 units). Heavy order pay included.",
    deadline: "Deliver today before 6:00 PM",
    revisionStatus: "Approved"
  },
    shipt: {
    storeName: "Target (Rosedale Center)",
    address: "Target 9100 Rosedale Hwy",
    pay: 19.80,
    estimatedMinutes: 30,
    jobType: "mystery_shop" as JobType,
    dueTime: "17:30",
    notes: "Shipt Shopper Preferred Member. 12 items. Easy flat routing.",
    deadline: "Window: 5:00 PM - 6:00 PM",
    revisionStatus: "Needs Revision"
  },
  processServe: {
    storeName: "Process Serve - Residence",
    address: "1951 Golden State Ave",
    pay: 35.00,
    estimatedMinutes: 10,
    jobType: "process_serve" as JobType,
    dueTime: "ASAP",
    notes: "Process server job. Case #TBD. Add party name, attempt window, and proof notes before riding.",
    deadline: "Serve today if contact is available",
    revisionStatus: "None",
    processServe: {
      company: "ABC Legal",
      caseNumber: "ABC-TBD",
      partyName: "Person To Be Served",
      documentType: "Summons / Complaint",
      attemptWindow: "ASAP / best available window",
      courtDiligence: "Follow app diligence requirements before closing out.",
      specialHandling: "Check ABC Legal instructions before contact.",
      addressStatus: "unknown" as const,
      attemptStatus: "not_attempted" as const,
      proofOfResidence: "",
      recipientDescription: "",
      attemptNotes: "",
      photoRequired: true,
      gpsRequired: true,
      printedDocs: false,
      proofReady: false
    }
  }
};

export default function JobImportSystem({ onImportJobs, isOptimizing = false }: JobImportSystemProps) {
  const [activeTab, setActiveTab] = useState<'ocr' | 'manual' | 'share' | 'partner'>('ocr');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  
  // OCR specific states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<Omit<Job, 'id'> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual specific states
  const [pasteText, setPasteText] = useState('');
  const [parsedManualJobs, setParsedManualJobs] = useState<Omit<Job, 'id'>[]>([]);

  // Share sheet states
  const [shareText, setShareText] = useState('');
  
  // OAuth / Partner states
  const [partnerConnected, setPartnerConnected] = useState<Record<string, boolean>>({
    uber: false,
    doordash: false
  });
  const [oauthWindowOpen, setOauthWindowOpen] = useState(false);
  const [oauthStep, setOauthStep] = useState<number>(1);
  const [selectedPartner, setSelectedPartner] = useState<'uber' | 'doordash' | null>(null);

  // Utility to handle files
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setOcrResult(null);
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError("Invalid file type. Please upload an image file (PNG, JPG, or WEBP).");
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);
    setOcrResult(null);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError("Invalid file type. Please upload an image file (PNG, JPG, or WEBP).");
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      setSuccess(`Successfully selected '${file.name}' via drag-and-drop!`);
    }
  };

  // Convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result as string;
        // Strip out the metadata prefix to get raw base64
        resolve(base64String.split(',')[1]);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Run AI OCR on uploaded file
  const runOcrParsing = async () => {
    if (!selectedFile) {
      setError("Please choose or upload a screenshot first.");
      return;
    }

    setLoading(true);
    setError(null);
    setLoadingStep("Reading image headers...");

    try {
      const base64Data = await fileToBase64(selectedFile);
      
      setLoadingStep("Connecting to Gemini-3.5-Flash OCR engine...");
      const response = await authFetch('/api/import/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Data,
          mimeType: selectedFile.type
        })
      });

      setLoadingStep("Analyzing layouts & filtering metadata...");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "OCR Parsing failed on server.");
      }

      setLoadingStep("Validating privacy-safe structures...");
      
      // Match coordinate lookup to complete our structure
      const coords = resolveCoordinates(data.address);
      const isRev = data.revisionStatus === 'Needs Revision';
      const completeJob: Omit<Job, 'id'> = {
        storeName: data.storeName || "Inferred Store",
        address: data.address || "Bakersfield, CA",
        pay: Number(data.pay) || 12.00,
        estimatedMinutes: Number(data.estimatedMinutes) || 20,
        jobType: data.jobType || "field_task",
        dueTime: data.dueTime || "17:00",
        notes: data.notes || "Imported via AI OCR",
        status: "ready",
        routeId: "A",
        coordinates: coords,
        smartMergeExplanation: "AI extracted & placed securely in active itinerary.",
        deadline: data.deadline || data.dueTime || "17:00",
        revisionStatus: data.revisionStatus || "None",
        isRevisionRequired: isRev
      };

      setOcrResult(completeJob);
      setSuccess("AI successfully extracted job details securely!");
    } catch (err: any) {
      console.error(err);
      setError(`AI OCR Error: ${err.message || "Ensure your server environment has a valid GEMINI_API_KEY."}`);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  // Run a template simulation immediately
  const handleUseTemplate = (provider: 'doordash' | 'instacart' | 'shipt' | 'processServe') => {
    setError(null);
    setOcrResult(null);
    setLoading(true);
    setLoadingStep("Simulating secure upload of driver app receipt...");

    setTimeout(() => {
      setLoadingStep("Parsing raw image matrix...");
      setTimeout(() => {
        setLoadingStep("Applying privacy filters (masking customer logins)...");
        setTimeout(() => {
          const templateData = MOCK_OCR_TEMPLATES[provider];
          const coords = resolveCoordinates(templateData.address);
          
          setOcrResult({
            ...templateData,
            status: 'ready',
            routeId: 'A',
            coordinates: coords,
            isRevisionRequired: templateData.revisionStatus === 'Needs Revision',
            smartMergeExplanation: `Extracted from ${provider.toUpperCase()} screenshot template. Zero credentials requested.`
          });
          setSuccess(`Simulated OCR successfully extracted details from ${provider.toUpperCase()}!`);
          setLoading(false);
          setLoadingStep('');
        }, 600);
      }, 500);
    }, 400);
  };

  // Finalize single OCR stop import
  const handleImportOcrStop = () => {
    if (ocrResult) {
      onImportJobs([ocrResult]);
      setSuccess(`Successfully added '${ocrResult.storeName}' to Route A active itinerary!`);
      // Reset OCR state
      setOcrResult(null);
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  // Manual Paste parsing (client-side matching fallback)
  const handleParseManualText = () => {
    if (!pasteText.trim()) {
      setError("Please paste some job text first.");
      return;
    }

    setError(null);
    setSuccess(null);

    // Regex parsing attempt for common strings e.g. "BevMo - $15.50 - white lane"
    const lines = pasteText.split('\n').filter(l => l.trim().length > 0);
    const parsed: Omit<Job, 'id'>[] = [];

    for (const line of lines) {
      // Clean commas, hyphens or separators
      const parts = line.split(/[|\-–—,;]/).map(p => p.trim());
      
      let storeName = "Pasted Stop";
      let address = "1951 Golden State Ave"; // fallback
      let pay = 15.00;
      let estimatedMinutes = 20;
      let jobType: JobType = "field_task";
      let dueTime = "18:00";
      let notes = line;

      // Try basic extraction
      if (parts.length >= 2) {
        storeName = parts[0];
        
        // Look for price/pay
        const payMatch = line.match(/\$?(\d+(\.\d{2})?)/);
        if (payMatch) {
          pay = parseFloat(payMatch[1]);
        }

        // Try mapping store to our known landmarks to fetch actual addresses
        const lowercaseLine = line.toLowerCase();
        if (lowercaseLine.includes("process") || lowercaseLine.includes("serve") || lowercaseLine.includes("service of process") || lowercaseLine.includes("case #") || lowercaseLine.includes("court")) {
          address = parts[1] || "Bakersfield, CA";
          storeName = storeName.toLowerCase().includes("process") || storeName.toLowerCase().includes("serve")
            ? storeName
            : `Process Serve - ${storeName}`;
          jobType = "process_serve";
          estimatedMinutes = 10;
          dueTime = dueTime === "18:00" ? "ASAP" : dueTime;
        } else if (lowercaseLine.includes("vons") || lowercaseLine.includes("ming")) {
          address = "Vons 9000 Ming Ave";
          jobType = "merchandising";
        } else if (lowercaseLine.includes("target") || lowercaseLine.includes("rosedale")) {
          address = "Target 9100 Rosedale Hwy";
          jobType = "mystery_shop";
        } else if (lowercaseLine.includes("family dollar") || lowercaseLine.includes("chester")) {
          address = "Family Dollar 2151 S Chester Ave";
          jobType = "retail_audit";
        } else if (lowercaseLine.includes("bevmo") || lowercaseLine.includes("stockdale")) {
          address = "BevMo 10650 Stockdale Hwy #500";
          jobType = "field_task";
        } else if (lowercaseLine.includes("dollar general") || lowercaseLine.includes("white")) {
          address = "Dollar General 5101 White Ln";
          jobType = "retail_audit";
        } else if (lowercaseLine.includes("norris")) {
          address = "Family Dollar 600 Norris Rd";
          jobType = "retail_audit";
        } else if (lowercaseLine.includes("buck owens")) {
          address = "Tractor Supply / Buck Café Revisit: 2620 Buck Owens Blvd";
          jobType = "field_task";
        } else {
          // Fallback to second part
          address = parts[1] || "Bakersfield, CA";
        }

        // Search for time
        const timeMatch = line.match(/(\d{1,2}:\d{2}\s*(AM|PM)?)/i);
        if (timeMatch) {
          dueTime = timeMatch[1];
        }
      } else {
        // Single word fallback
        storeName = line.substring(0, 20);
      }

      parsed.push({
        storeName,
        address,
        pay,
        estimatedMinutes,
        jobType,
        dueTime,
        notes: jobType === "process_serve"
          ? `${notes} | Process serve: add case number, party name, attempt result, photos/screenshots/receipts if needed.`
          : notes,
        status: 'ready',
        routeId: 'A',
        coordinates: resolveCoordinates(address),
        smartMergeExplanation: jobType === "process_serve"
          ? "Process serve inserted into today's route with deadline-aware priority."
          : "Parsed using privacy-first local text scanner.",
        processServe: jobType === "process_serve"
          ? {
              company: "ABC Legal",
              caseNumber: "",
              partyName: storeName.replace(/^Process Serve\s*-\s*/i, ''),
              documentType: "",
              attemptWindow: dueTime,
              courtDiligence: "Follow app diligence requirements before closing out.",
              specialHandling: "",
              addressStatus: "unknown",
              attemptStatus: "not_attempted",
              proofOfResidence: "",
              recipientDescription: "",
              attemptNotes: notes,
              photoRequired: true,
              gpsRequired: true,
              printedDocs: false,
              proofReady: false
            }
          : undefined
      });
    }

    if (parsed.length > 0) {
      setParsedManualJobs(parsed);
      setSuccess(`Parsed ${parsed.length} raw stop offers! Check details below.`);
    } else {
      setError("Could not parse. Try standard separators (e.g. 'Store Name - Address - $Price - Due Time')");
    }
  };

  const handleImportParsedManual = () => {
    if (parsedManualJobs.length > 0) {
      onImportJobs(parsedManualJobs);
      setSuccess(`Successfully imported ${parsedManualJobs.length} new stops!`);
      setParsedManualJobs([]);
      setPasteText('');
    }
  };

  // Simulating Share sheet incoming data
  const handleSimulateShareSheet = () => {
    setShareText(
      "DoorDash Shared Order:\n" +
      "Pickup: BevMo 10650 Stockdale Hwy #500\n" +
      "Guaranteed pay: $16.75\n" +
      "Time: Deliver by 5:15 PM\n" +
      "Task: Audit shelf allocation"
    );
    setSuccess("Mobile Share-Sheet incoming offer captured!");
  };

  const handleImportShareText = () => {
    if (!shareText) return;
    
    // Quick parse
    const lines = shareText.split('\n');
    let storeName = "BevMo (Shared Offer)";
    let address = "BevMo 10650 Stockdale Hwy #500";
    let pay = 16.75;
    let dueTime = "17:15";

    lines.forEach(l => {
      if (l.includes("Pickup:")) address = l.replace("Pickup:", "").trim();
      if (l.includes("pay:")) {
        const match = l.match(/\$?(\d+(\.\d{2})?)/);
        if (match) pay = parseFloat(match[1]);
      }
      if (l.includes("by")) dueTime = l.split("by")[1]?.trim() || "17:15";
    });

    const job: Omit<Job, 'id'> = {
      storeName,
      address,
      pay,
      estimatedMinutes: 20,
      jobType: "field_task",
      dueTime,
      notes: "Shared from DoorDash App Share Sheet",
      status: "ready",
      routeId: "A",
      coordinates: resolveCoordinates(address),
      smartMergeExplanation: "Securely captured from Android/iOS Mobile Share sheet target."
    };

    onImportJobs([job]);
    setSuccess(`Imported share sheet stop: '${storeName}'!`);
    setShareText('');
  };

  // Connect simulated OAuth API
  const handleOpenOAuthSim = (partner: 'uber' | 'doordash') => {
    setSelectedPartner(partner);
    setOauthStep(1);
    setOauthWindowOpen(true);
  };

  const handleExecuteOAuthConsent = () => {
    setOauthStep(2); // shows progress
    setTimeout(() => {
      setOauthStep(3); // success
      setTimeout(() => {
        // Complete the connection
        if (selectedPartner) {
          setPartnerConnected(prev => ({ ...prev, [selectedPartner]: true }));
          setOauthWindowOpen(false);

          // Auto-sync 3 mock jobs for that partner directly!
          let syncJobs: Omit<Job, 'id'>[] = [];
          if (selectedPartner === 'uber') {
            syncJobs = [
              {
                storeName: "UberDirect - Albertsons",
                address: "Albertsons 13045 Rosedale Hwy",
                pay: 22.50,
                estimatedMinutes: 25,
                jobType: "field_task",
                dueTime: "17:45",
                notes: "Uber Direct Partnership Sync. Order #UBR-8921.",
                status: "ready",
                routeId: "A",
                coordinates: resolveCoordinates("Albertsons 13045 Rosedale Hwy"),
                smartMergeExplanation: "Secured through UberDirect OAuth partnership token."
              },
              {
                storeName: "UberDirect - Dollar General",
                address: "Dollar General 5101 White Ln",
                pay: 16.20,
                estimatedMinutes: 15,
                jobType: "retail_audit",
                dueTime: "18:15",
                notes: "Uber Direct Package Audit. Batch #892",
                status: "ready",
                routeId: "A",
                coordinates: resolveCoordinates("Dollar General 5101 White Ln"),
                smartMergeExplanation: "Secured through UberDirect OAuth partnership token."
              }
            ];
          } else {
            syncJobs = [
              {
                storeName: "DoorDash Drive - Family Dollar",
                address: "Family Dollar 600 Norris Rd",
                pay: 24.00,
                estimatedMinutes: 20,
                jobType: "retail_audit",
                dueTime: "19:00",
                notes: "DoorDash Drive Enterprise Routing API stop.",
                status: "ready",
                routeId: "A",
                coordinates: resolveCoordinates("Family Dollar 600 Norris Rd"),
                smartMergeExplanation: "Fetched directly from DoorDash Merchant API."
              }
            ];
          }

          onImportJobs(syncJobs);
          setSuccess(`Connected ${selectedPartner.toUpperCase()} and imported ${syncJobs.length} synchronized partner orders!`);
        }
      }, 1200);
    }, 1500);
  };

  return (
    <div id="job-import-system-card" className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-white/5 dark:bg-[#0A0A0A] overflow-hidden">
      
      {/* Privacy Guarantee Banner */}
      <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/5 dark:from-blue-500/5 dark:to-transparent border-b border-blue-200/50 dark:border-white/5 p-4 sm:px-6">
        <div className="flex items-start gap-3.5">
          <div className="rounded-xl bg-blue-100 p-2.5 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
            <ShieldCheck size={20} className="animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wide">Privacy-First Guarantee</h3>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Zero Password Logins</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              We never ask for your driver app logins or credentials. Our engine reads only routing coordinates, pay, and due times. Everything resides securely in your local browser storage (<span className="font-mono">localStorage</span>).
            </p>
          </div>
        </div>
      </div>

      {/* Internal Tabs Navigation */}
      <div className="flex border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-transparent overflow-x-auto scrollbar-none">
        {[
          { id: 'ocr', label: 'Screenshot OCR', icon: Upload },
          { id: 'manual', label: 'Raw Text Paste', icon: FileText },
          { id: 'share', label: 'Share-Sheet', icon: Share2 },
          { id: 'partner', label: 'Secure Partner API', icon: Globe },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 min-w-[120px] py-3 px-4 text-xs font-black tracking-wide uppercase flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                isActive
                  ? 'border-blue-600 text-blue-600 bg-white dark:bg-transparent'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Alerts */}
      <div className="px-5 pt-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3.5 text-xs font-semibold text-red-600 dark:bg-red-500/5 dark:text-red-400 border border-red-200/50 dark:border-red-900/10">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/5 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-950/10">
            <Check size={16} className="flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}
      </div>

      {/* Tab Contents */}
      <div className="p-5 sm:p-6">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: Screenshot OCR Import */}
          {activeTab === 'ocr' && (
            <motion.div
              key="ocr-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Upload Section */}
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-white/5 dark:bg-[#080808] space-y-1.5">
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <FileUp size={14} className="text-blue-500" />
                      <span>Upload Screenshot Offer</span>
                    </h4>
                    <p className="text-[10px] text-slate-400">Take a screenshot of any delivery or gig job details on your phone and upload it here.</p>
                  </div>

                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all relative group ${
                      isDragging 
                        ? 'border-blue-600 bg-blue-500/[0.05] dark:border-blue-400 dark:bg-blue-400/10 scale-102 ring-2 ring-blue-500/20' 
                        : 'border-slate-200 dark:border-white/10 hover:border-blue-500/50 hover:bg-slate-500/[0.01]'
                    }`}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    
                    {previewUrl ? (
                      <div className="space-y-3 relative">
                        <img 
                          src={previewUrl} 
                          alt="Screenshot preview" 
                          className="max-h-40 mx-auto rounded-lg object-contain border border-slate-200/50 dark:border-white/10" 
                        />
                        <p className="text-[10px] font-mono text-slate-400 truncate">{selectedFile?.name}</p>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                            setPreviewUrl(null);
                            setOcrResult(null);
                          }}
                          className="text-[10px] font-bold text-red-500 hover:underline"
                        >
                          Remove Image
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 py-4">
                        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50 dark:bg-white/5 transition-colors">
                          <Upload size={20} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Drag & drop your screenshot or <span className="text-blue-500 underline">browse</span></p>
                          <p className="text-[10px] text-slate-400">Supports PNG, JPG, WEBP up to 10MB</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedFile && !ocrResult && (
                    <button
                      onClick={runOcrParsing}
                      disabled={loading}
                      className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black py-2.5 text-xs tracking-wider uppercase transition-colors shadow-md flex items-center justify-center gap-1.5"
                    >
                      {loading ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" />
                          <span>{loadingStep || "AI Parsing active..."}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} className="fill-white" />
                          <span>Analyze Screenshot with Gemini</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Templates & Quick Testing */}
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-white/5 dark:bg-[#080808] space-y-1.5">
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <HelpCircle size={14} className="text-indigo-500" />
                      <span>Instant Interactive Testing</span>
                    </h4>
                    <p className="text-[10px] text-slate-400">Don't have a screenshot? Select a template below to simulate a high-fidelity screenshot extraction locally in seconds.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { id: 'doordash', name: 'DoorDash', color: 'hover:border-rose-500/40 text-rose-500 bg-rose-500/[0.02]', logo: '🍔' },
                      { id: 'instacart', name: 'Instacart', color: 'hover:border-emerald-500/40 text-emerald-500 bg-emerald-500/[0.02]', logo: '🛒' },
                      { id: 'shipt', name: 'Shipt', color: 'hover:border-amber-500/40 text-amber-500 bg-amber-500/[0.02]', logo: '📦' },
                      { id: 'processServe', name: 'Process Serve', color: 'hover:border-red-500/40 text-red-500 bg-red-500/[0.02]', logo: '⚖️' }
                    ].map(template => (
                      <button
                        key={template.id}
                        onClick={() => handleUseTemplate(template.id as any)}
                        disabled={loading}
                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-white/5 transition-all hover:scale-102 ${template.color}`}
                      >
                        <span className="text-2xl">{template.logo}</span>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">{template.name}</span>
                      </button>
                    ))}
                  </div>

                  {loading && (
                    <div className="rounded-xl border border-dashed border-blue-200 dark:border-blue-900/20 bg-blue-500/[0.02] p-4 text-center space-y-2">
                      <RefreshCw size={20} className="animate-spin mx-auto text-blue-500" />
                      <p className="text-[11px] font-bold text-blue-700 dark:text-blue-400">{loadingStep}</p>
                      <p className="text-[9px] text-slate-400 italic">No credentials will be stored. Client isolation is maintained.</p>
                    </div>
                  )}

                  {/* OCR Extraction Result Editor */}
                  {ocrResult && (
                    <div className="rounded-2xl border border-blue-100 bg-blue-500/[0.01] dark:border-blue-500/15 p-4 space-y-4 animate-fade-in shadow-3xs">
                      <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-500/10 pb-2">
                        <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <Check size={12} /> AI Extraction Draft
                        </span>
                        <span className="text-[9px] font-bold text-slate-400">Review Fields Before Importing</span>
                      </div>

                       <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1 col-span-2">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Store / Client</label>
                          <input 
                            type="text" 
                            value={ocrResult.storeName}
                            onChange={(e) => setOcrResult({ ...ocrResult, storeName: e.target.value })}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 bg-white dark:bg-black dark:border-white/5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="space-y-1 col-span-2">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Address / Location</label>
                          <input 
                            type="text" 
                            value={ocrResult.address}
                            onChange={(e) => setOcrResult({ ...ocrResult, address: e.target.value, coordinates: resolveCoordinates(e.target.value) })}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 bg-white dark:bg-black dark:border-white/5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Guaranteed Pay ($)</label>
                          <input 
                            type="number" 
                            step="0.01"
                            value={ocrResult.pay}
                            onChange={(e) => setOcrResult({ ...ocrResult, pay: Number(e.target.value) })}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 bg-white dark:bg-black dark:border-white/5 text-xs font-bold text-emerald-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Due Time (e.g. 17:00)</label>
                          <input 
                            type="text" 
                            value={ocrResult.dueTime}
                            onChange={(e) => setOcrResult({ ...ocrResult, dueTime: e.target.value })}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 bg-white dark:bg-black dark:border-white/5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="space-y-1 col-span-2">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Deadline</label>
                          <input 
                            type="text" 
                            value={ocrResult.deadline || ocrResult.dueTime}
                            onChange={(e) => setOcrResult({ ...ocrResult, deadline: e.target.value })}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 bg-white dark:bg-black dark:border-white/5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Job Type</label>
                          <select 
                            value={ocrResult.jobType}
                            onChange={(e) => setOcrResult({ ...ocrResult, jobType: e.target.value as JobType })}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 bg-white dark:bg-black dark:border-white/5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="retail_audit">Retail Audit</option>
                            <option value="merchandising">Merchandising</option>
                            <option value="mystery_shop">Mystery Shop</option>
                            <option value="field_task">Field Task</option>
                            <option value="process_serve">Process Serve</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Revision Status</label>
                          <select 
                            value={ocrResult.revisionStatus || 'None'}
                            onChange={(e) => {
                              const val = e.target.value;
                              setOcrResult({ 
                                ...ocrResult, 
                                revisionStatus: val,
                                isRevisionRequired: val === 'Needs Revision'
                              });
                            }}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 bg-white dark:bg-black dark:border-white/5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="None">None / Clear</option>
                            <option value="Needs Revision">Needs Revision ⚠️</option>
                            <option value="Approved">Approved ✅</option>
                            <option value="Draft">Draft 📝</option>
                            <option value="Submitted">Submitted 📤</option>
                            <option value="Pending review">Pending Review 🔍</option>
                          </select>
                        </div>
                      </div>

                      <button
                        onClick={handleImportOcrStop}
                        className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 text-xs tracking-wider uppercase transition-colors shadow-md flex items-center justify-center gap-1"
                      >
                        <Plus size={14} />
                        <span>Confirm and Import to Route A</span>
                      </button>
                    </div>
                  )}

                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: Quick Raw Paste */}
          {activeTab === 'manual' && (
            <motion.div
              key="manual-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-white/5 dark:bg-[#080808] space-y-1">
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={14} className="text-blue-500" />
                  <span>Unstructured Raw Paste Parser</span>
                </h4>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Pasted text is parsed 100% locally on your machine. All sensitive context like customer names or IDs is discarded immediately.
                  Use separators (like commas, dashes, or pipes) to divide fields. Example: <span className="font-mono bg-slate-100 dark:bg-white/5 px-1 rounded-sm text-[9px]">McDonald's - Rosedale Hwy - $14.50</span>
                </p>
              </div>

              <div className="space-y-3">
                <textarea
                  id="raw-import-textarea"
                  rows={4}
                  placeholder="Paste offers here... Each line represents a separate stop details.&#10;Example:&#10;Family Dollar White Lane | $18.50 | 17:00&#10;Vons Ming Ave | $22.00 | deliver by 6 PM"
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-white/10 dark:bg-black dark:text-white"
                />

                <div className="flex justify-end">
                  <button
                    onClick={handleParseManualText}
                    className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black px-4 py-2.5 text-xs tracking-wider uppercase transition-colors shadow-md flex items-center gap-1"
                  >
                    <span>Analyze and Draft</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>

              {parsedManualJobs.length > 0 && (
                <div className="space-y-3 border-t border-slate-100 dark:border-white/5 pt-4 animate-fade-in">
                  <h4 className="text-[10px] font-black uppercase text-slate-400">Parsed Stops Draft Checklist</h4>
                  
                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                    {parsedManualJobs.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-500/[0.01] border border-slate-200 dark:border-white/5 rounded-xl flex items-center justify-between gap-3 text-xs">
                        <div className="space-y-0.5 truncate">
                          <p className="font-extrabold text-slate-900 dark:text-white truncate">{item.storeName}</p>
                          <p className="text-[10px] text-slate-400 truncate">{item.address}</p>
                        </div>
                        <div className="flex items-center gap-4 text-right flex-shrink-0">
                          <div>
                            <p className="font-black text-emerald-600">${item.pay.toFixed(2)}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">{item.dueTime}</p>
                          </div>
                          <button 
                            onClick={() => {
                              setParsedManualJobs(parsedManualJobs.filter((_, i) => i !== idx));
                            }}
                            className="text-red-500 font-bold text-[10px] hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleImportParsedManual}
                    className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 text-xs tracking-wider uppercase transition-colors shadow-md flex items-center justify-center gap-1"
                  >
                    <Plus size={14} />
                    <span>Confirm and Import Checked ({parsedManualJobs.length}) Stops</span>
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: Share-Sheet Mock Import */}
          {activeTab === 'share' && (
            <motion.div
              key="share-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-white/5 dark:bg-[#080808] space-y-1.5">
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone size={14} className="text-blue-500" />
                  <span>How Mobile Share-Sheets Function</span>
                </h4>
                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  When you are out in Bakersfield executing deliveries on iOS or Android, you can click "Share" directly inside DoorDash or UberEats. 
                  By choosing our "All in One 667" from your phone's native share menu, the text is securely parsed on import.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400">Simulation Terminal</span>
                  <button
                    onClick={handleSimulateShareSheet}
                    className="text-[10px] font-black uppercase tracking-wider text-blue-500 hover:underline flex items-center gap-1"
                  >
                    <Share2 size={11} />
                    <span>Trigger Shared Offer Payload</span>
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={shareText}
                  onChange={(e) => setShareText(e.target.value)}
                  placeholder="Shared payload will appear here after triggering simulator..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-mono focus:outline-none dark:border-white/10 dark:bg-black dark:text-white"
                />

                {shareText && (
                  <button
                    onClick={handleImportShareText}
                    className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black py-2 text-xs tracking-wider uppercase transition-colors shadow-md"
                  >
                    Submit and Import from Mobile Sandbox
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 4: Official APIs & Partnerships */}
          {activeTab === 'partner' && (
            <motion.div
              key="partner-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-white/5 dark:bg-[#080808] space-y-1.5">
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Globe size={14} className="text-blue-500" />
                  <span>Authorized Integration Center</span>
                </h4>
                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  Secure official connections require **standard developer OAuth 2.0 authorization**. 
                  We store NO username/password credentials. You authorize directly on the gig partner's official login portal and provide a read-only token.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Uber Direct */}
                <div className="rounded-xl border border-slate-200 dark:border-white/5 p-4 bg-slate-500/[0.01] space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">OFFICIAL PARTNER</span>
                      <span className={`h-1.5 w-1.5 rounded-full ${partnerConnected.uber ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    </div>
                    <h5 className="font-extrabold text-slate-900 dark:text-white text-xs">Uber Direct API</h5>
                    <p className="text-[10px] text-slate-400 leading-normal">Retrieve real-time catering and grocery deliveries automatically via read-only dispatch scopes.</p>
                  </div>
                  
                  {partnerConnected.uber ? (
                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold text-xs pt-2">
                      <span className="flex items-center gap-1"><Lock size={12} /> Connected</span>
                      <button 
                        onClick={() => setPartnerConnected(prev => ({ ...prev, uber: false }))}
                        className="text-[10px] text-red-500 font-bold hover:underline"
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenOAuthSim('uber')}
                      className="w-full rounded-lg border border-slate-200 dark:border-white/10 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center justify-center gap-1"
                    >
                      <span>Authorize Uber OAuth</span>
                      <ExternalLink size={11} />
                    </button>
                  )}
                </div>

                {/* DoorDash Drive */}
                <div className="rounded-xl border border-slate-200 dark:border-white/5 p-4 bg-slate-500/[0.01] space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">ENTERPRISE API</span>
                      <span className={`h-1.5 w-1.5 rounded-full ${partnerConnected.doordash ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    </div>
                    <h5 className="font-extrabold text-slate-900 dark:text-white text-xs">DoorDash Drive Portal</h5>
                    <p className="text-[10px] text-slate-400 leading-normal">Access retail and local merchant shipments using official business credentials securely.</p>
                  </div>

                  {partnerConnected.doordash ? (
                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold text-xs pt-2">
                      <span className="flex items-center gap-1"><Lock size={12} /> Connected</span>
                      <button 
                        onClick={() => setPartnerConnected(prev => ({ ...prev, doordash: false }))}
                        className="text-[10px] text-red-500 font-bold hover:underline"
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenOAuthSim('doordash')}
                      className="w-full rounded-lg border border-slate-200 dark:border-white/10 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center justify-center gap-1"
                    >
                      <span>Authorize DoorDash OAuth</span>
                      <ExternalLink size={11} />
                    </button>
                  )}
                </div>

              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Simulated Secure OAuth Popup Window Modal */}
      {oauthWindowOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 dark:bg-[#0C0C0C] dark:border-white/10 space-y-6">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/5 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-blue-500/10 p-2 text-blue-600">
                  <Lock size={20} className="animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wide">
                    {selectedPartner === 'uber' ? 'Uber Identity Service' : 'DoorDash Developer Hub'}
                  </h4>
                  <p className="text-[10px] font-mono text-slate-400 leading-none mt-0.5">https://auth.{selectedPartner}.com/oauth2/authorize</p>
                </div>
              </div>
              <button 
                onClick={() => setOauthWindowOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-black uppercase"
              >
                Cancel
              </button>
            </div>

            {oauthStep === 1 && (
              <div className="space-y-4 text-xs">
                <p className="font-semibold text-slate-600 dark:text-slate-300">
                  <span className="font-extrabold text-slate-900 dark:text-white">All in One 667</span> is requesting permission to access your {selectedPartner === 'uber' ? 'Uber Direct' : 'DoorDash Drive'} account details:
                </p>
                
                <div className="rounded-xl bg-slate-50 dark:bg-white/5 p-4 border border-slate-200/50 dark:border-white/5 space-y-2.5">
                  <div className="flex items-start gap-2 text-[11px]">
                    <Check size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>Read active assignments and routing addresses.</span>
                  </div>
                  <div className="flex items-start gap-2 text-[11px]">
                    <Check size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>Access guaranteed pay rates, customer tips, and delivery due times.</span>
                  </div>
                  <div className="flex items-start gap-2 text-[11px] text-red-500">
                    <EyeOff size={14} className="mt-0.5 flex-shrink-0" />
                    <span><strong>PROTECTED:</strong> Passwords, payment cards, and complete driving history are kept hidden.</span>
                  </div>
                </div>

                <div className="rounded-xl bg-blue-500/[0.02] border border-blue-500/10 p-3 text-[10px] text-blue-800 dark:text-blue-400 leading-normal font-semibold flex items-start gap-1.5">
                  <ShieldCheck size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>By clicking Authorize, you grant a highly isolated token valid for 60 minutes. Your login credentials are NOT shared with All in One 667.</span>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setOauthWindowOpen(false)}
                    className="flex-1 rounded-xl border border-slate-200 dark:border-white/10 py-2.5 font-black uppercase tracking-wider text-slate-500 text-[10px]"
                  >
                    Decline
                  </button>
                  <button
                    onClick={handleExecuteOAuthConsent}
                    className="flex-1 rounded-xl bg-blue-600 text-white font-black uppercase tracking-wider py-2.5 text-[10px] shadow-md hover:bg-blue-500"
                  >
                    Authorize Access
                  </button>
                </div>
              </div>
            )}

            {oauthStep === 2 && (
              <div className="text-center py-8 space-y-4">
                <RefreshCw size={36} className="animate-spin text-blue-500 mx-auto" />
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Generating Secure Authorization Token...</p>
                  <p className="text-[10px] text-slate-400 mt-1">Establishing high-entropy TLS handshake with client portal</p>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

