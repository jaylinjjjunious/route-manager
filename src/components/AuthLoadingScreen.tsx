import React from "react";
import { Loader2 } from "lucide-react";

export default function AuthLoadingScreen() {
  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="flex flex-col items-center justify-center" style={{ minHeight: "80vh" }}>
        <div className="mb-6 rounded-full bg-blue-600/20 p-4">
          <Loader2 size={32} className="animate-spin text-blue-400" />
        </div>
        <p className="text-sm font-black uppercase tracking-widest text-blue-300">
          Route Manager
        </p>
        <h1 className="mt-3 text-3xl font-black text-white">
          Checking credentials...
        </h1>
        <p className="mt-3 text-sm font-bold text-slate-400">
          Please wait while we verify your session.
        </p>
      </div>
    </main>
  );
}
