import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, DoorOpen, Layers3, LogOut, Route } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import AuthLoadingScreen from '../components/AuthLoadingScreen';

const RouteManager = lazy(() => import('../App'));

// Keep existing room bookmarks working while a bare URL opens the hallway.
export function isRouteManagerLocation(location: Pick<Location, 'pathname' | 'hash'>): boolean {
  const tab = location.hash.slice(1).toLowerCase();
  return ['dashboard', 'jobs', 'more', 'inventory', 'battery', 'tracker', 'habits', 'tools',
    'settings', 'checkin', 'changepassword', 'admin', 'diagnostics', 'route', 'routes'].includes(tab)
    || /^\/(admin|route|routes|jobs)\/?$/i.test(location.pathname);
}

type ShellProps = {
  debugCenterOpen?: boolean;
  onCloseDebugCenter?: () => void;
  onOpenDebugCenter?: () => void;
};

export default function SoftwareShell(props: ShellProps) {
  const { user, signOut } = useAuth();
  const [inRoom, setInRoom] = useState(() => isRouteManagerLocation(window.location));
  const [signOutError, setSignOutError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const hallwayTitle = useRef<HTMLHeadingElement>(null);
  const returning = useRef(false);

  useEffect(() => {
    const syncLocation = () => setInRoom(isRouteManagerLocation(window.location));
    window.addEventListener('hashchange', syncLocation);
    window.addEventListener('popstate', syncLocation);
    return () => {
      window.removeEventListener('hashchange', syncLocation);
      window.removeEventListener('popstate', syncLocation);
    };
  }, []);

  useEffect(() => {
    document.title = inRoom ? 'Route Manager · All in One' : 'All in One · Main menu';
    window.scrollTo(0, 0);
    if (!inRoom && returning.current) hallwayTitle.current?.focus();
    returning.current = inRoom;
  }, [inRoom]);

  const navigate = (room: boolean) => {
    window.history.pushState(null, '', room ? '/#dashboard' : '/#home');
    setInRoom(room);
  };

  if (inRoom) {
    return (
      <Suspense fallback={<AuthLoadingScreen />}>
        <RouteManager {...props} onExitToHallway={() => navigate(false)} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-dvh bg-[#090911] text-slate-100 font-sans" style={{ backgroundImage: 'radial-gradient(ellipse at 85% 5%, #34205166, transparent 55%)' }}>
      <header className="border-b border-white/10 px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl border border-violet-300/20 bg-violet-400/10 p-3"><Layers3 aria-hidden="true" size={22} /></span>
            <div><p className="text-lg font-bold tracking-tight">All in One</p><p className="text-xs text-slate-400">Your software, one place</p></div>
          </div>
          <button type="button" disabled={signingOut} onClick={async () => {
            setSigningOut(true);
            setSignOutError('');
            try { await signOut(); } catch { setSignOutError('Could not sign out. Please try again.'); }
            finally { setSigningOut(false); }
          }} className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm text-slate-300 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-violet-300 disabled:opacity-50">
            <LogOut size={16} aria-hidden="true" />{signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 pb-[max(3rem,env(safe-area-inset-bottom))] pt-12 sm:px-10 sm:pt-20">
        <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-300"><DoorOpen size={16} aria-hidden="true" /> Main menu</p>
        <h1 ref={hallwayTitle} tabIndex={-1} className="text-4xl font-semibold tracking-tight outline-none sm:text-5xl">Your hallway.</h1>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-400">Choose a room to get started. Each software has its own workspace. Come back here whenever you want to switch.</p>
        <section aria-label="Software rooms" className="mt-10 grid gap-5 sm:grid-cols-2">
          <button type="button" onClick={() => navigate(true)} className="group flex min-h-64 flex-col items-start rounded-3xl border border-violet-300/30 bg-gradient-to-br from-violet-500/15 to-white/[0.02] p-7 text-left transition hover:border-violet-300/70 hover:from-violet-500/25 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-300" aria-label="Open Route Manager">
            <span className="mb-7 flex w-full items-center justify-between"><span className="rounded-2xl bg-violet-400/15 p-3 text-violet-200"><Route size={28} aria-hidden="true" /></span><span className="flex items-center gap-2 text-xs font-medium text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />Available</span></span>
            <span className="text-2xl font-semibold tracking-tight">Route Manager</span>
            <span className="mt-2 max-w-xs text-sm leading-relaxed text-slate-400">Plan your day, manage jobs, and use your route tools.</span>
            <span className="mt-7 flex items-center gap-2 text-sm font-semibold text-violet-200">Enter room <ArrowUpRight size={18} aria-hidden="true" /></span>
          </button>
          <div className="flex min-h-48 flex-col justify-center rounded-3xl border border-dashed border-white/15 p-7">
            <p className="text-lg font-medium text-slate-300">Room to grow.</p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500">More software can have a place here as you add it.</p>
          </div>
        </section>
        {user?.email && <p className="mt-8 break-words text-xs text-slate-500">Signed in as {user.email}</p>}
        {signOutError && <p role="alert" className="mt-4 text-sm text-red-300">{signOutError}</p>}
      </main>
    </div>
  );
}
