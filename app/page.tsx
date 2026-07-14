"use client";

import { type ComponentType, useEffect, useState } from "react";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [AppComponent, setAppComponent] = useState<ComponentType | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let isMounted = true;
    import("../src/App")
      .then((module) => {
        if (isMounted) setAppComponent(() => module.default);
      })
      .catch((error) => {
        if (isMounted) {
          setLoadError(error instanceof Error ? error.message : "Unknown app load error");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [mounted]);

  if (loadError) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <p className="text-sm font-black uppercase tracking-widest text-red-300">
          Route Manager
        </p>
        <h1 className="mt-3 text-4xl font-black">Mission Control could not load.</h1>
        <p className="mt-4 max-w-xl text-sm font-bold text-slate-300">
          Reload the page. If it happens again, the app will show this screen instead of staying stuck.
        </p>
      </main>
    );
  }

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

  if (!AppComponent) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <p className="text-sm font-black uppercase tracking-widest text-blue-300">
          Route Manager
        </p>
        <h1 className="mt-3 text-4xl font-black">Loading Mission Control...</h1>
      </main>
    );
  }

  return <AppComponent />;
}
