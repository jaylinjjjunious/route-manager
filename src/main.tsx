import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {AuthProvider} from './auth/AuthProvider';
import {DebugProvider} from './debug/DebugProvider';
import ProtectedApp from './auth/ProtectedApp';
import './index.css';

function isRetiredRouteDestination(value: string): boolean {
  const normalized = value.toLowerCase().replace(/^[/#]+/, '').replace(/\/$/, '');
  return normalized === 'route' || normalized === 'routes';
}

function redirectRetiredRouteDestination() {
  if (isRetiredRouteDestination(window.location.pathname) || isRetiredRouteDestination(window.location.hash)) {
    window.history.replaceState(null, '', '/#dashboard');
  }
}

redirectRetiredRouteDestination();

const rootElement = document.getElementById('root');

function StartupScreen({ error }: { error?: string }) {
  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <p className={`text-sm font-black uppercase tracking-widest ${error ? 'text-red-300' : 'text-blue-300'}`}>
        All in One 667
      </p>
      <h1 className="mt-3 text-4xl font-black">
        {error ? 'Mission Control could not load.' : 'Loading Mission Control...'}
      </h1>
      {error ? (
        <div className="mt-4 max-w-xl space-y-3 text-sm font-bold text-slate-300">
          <p>The app hit a startup problem instead of opening cleanly.</p>
          <button
            className="rounded bg-blue-500 px-4 py-2 text-sm font-black uppercase tracking-wide text-white"
            type="button"
            onClick={() => window.location.replace(`${window.location.pathname}?fresh=${Date.now()}`)}
          >
            Reload app
          </button>
          <p className="break-words text-xs text-slate-500">{error}</p>
        </div>
      ) : null}
    </main>
  );
}

async function bootApp() {
  if (!rootElement) {
    throw new Error('Missing root element');
  }

  const root = createRoot(rootElement);
  root.render(<StartupScreen />);

  try {
    // Validate Supabase config is available before rendering
    await import('./lib/supabase.ts');
    root.render(
      <StrictMode>
        <DebugProvider>
          <AuthProvider>
            <ProtectedApp />
          </AuthProvider>
        </DebugProvider>
      </StrictMode>,
    );
  } catch (error) {
    root.render(<StartupScreen error={error instanceof Error ? error.message : 'Unknown startup error'} />);
  }
}

bootApp();

