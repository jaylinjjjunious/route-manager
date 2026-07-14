"use client";

import { useEffect, useState } from "react";
import App from "../src/App";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <p className="text-sm font-black uppercase tracking-widest text-blue-300">
          Route Manager
        </p>
        <h1 className="mt-3 text-4xl font-black">Loading Mission Control...</h1>
      </main>
    );
  }

  return <App />;
}
