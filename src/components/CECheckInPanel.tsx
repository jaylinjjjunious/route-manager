"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Maximize2, Minimize2, RefreshCw, Loader2 } from "lucide-react";

const PROXY_BASE = "/api/proxy/ce-checkin";

export function CECheckInPanel() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [src, setSrc] = useState<string>(PROXY_BASE + "/");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      setLoading(false);
      setError(null);
    };

    const handleError = () => {
      setLoading(false);
      setError("Failed to load CE Check-In. The site may block embedding.");
    };

    iframe.addEventListener("load", handleLoad);
    iframe.addEventListener("error", handleError);

    return () => {
      iframe.removeEventListener("load", handleLoad);
      iframe.removeEventListener("error", handleError);
    };
  }, []);

  const reload = () => {
    setLoading(true);
    setError(null);
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.src = PROXY_BASE + "/";
    }
  };

  const goHome = () => {
    setLoading(true);
    setError(null);
    setSrc(PROXY_BASE + "/");
  };

  if (error && !fullscreen) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-900/50 rounded-2xl border border-red-500/30">
        <div className="text-red-400 mb-4 text-4xl">⚠️</div>
        <p className="text-white/80 mb-4">{error}</p>
        <button
          onClick={goHome}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
        <p className="mt-4 text-xs text-white/50">
          Or use <button onClick={() => window.open("https://checkin.ce-connect.com", "_blank")} className="text-blue-400 underline">external browser</button>
        </p>
      </div>
    );
  }

  const containerClass = `
    flex flex-col h-full bg-slate-950 rounded-2xl border border-white/10 overflow-hidden
    ${fullscreen ? "fixed inset-0 z-50" : "h-[600px]"}
  `.trim();

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-white/10 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-white/60">CE Check-In</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[11px] text-white/50 font-mono">checkin.ce-connect.com</span>
        </div>
        <div className="flex items-center gap-1">
          {loading && <Loader2 className="w-4 h-4 text-white/50 animate-spin" />}
          <button onClick={reload} title="Reload" className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={goHome} title="Home" className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors">
            <ExternalLink className="w-4 h-4" />
          </button>
          <button onClick={() => setFullscreen(!fullscreen)} title={fullscreen ? "Exit fullscreen" : "Fullscreen"} className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors">
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <iframe
          ref={iframeRef}
          src={src}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads allow-presentation allow-top-navigation-by-user-activation"
          allow="camera; microphone; geolocation"
          referrerPolicy="origin-when-cross-origin"
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-10">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
              <p className="text-white/70">Loading CE Check-In...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}