import React, { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import App from './App';
import { cloudApi, cloudClient } from './cloudClient';
import { accountKey, CleaningSync } from './cloudSync';
import { emptyPlan, mergeBackup, parsePlan } from './model';
import { STORAGE_KEY, savePlan } from './storage';

function AccountWorkspace({ session }: { session: Session }) {
  const [engine, setEngine] = useState<CleaningSync | null>(null);
  const [epoch, setEpoch] = useState(0);
  const [, update] = useState(0);
  const [error, setError] = useState('');
  const [imported, setImported] = useState(false);
  const key = accountKey(session.user.id);
  useEffect(() => {
    const sync = new CleaningSync(session.user.id, localStorage, cloudApi(session.user.id), applied => { update(n => n + 1); if (applied) setEpoch(n => n + 1); });
    setEngine(sync); void sync.sync();
    const refresh = () => { void sync.sync(); };
    const storage = (event: StorageEvent) => { if (event.key === key || event.key === `${key}.sync` || event.key === null) refresh(); };
    const visible = () => { if (document.visibilityState === 'visible') refresh(); };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('online', refresh); window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', visible); window.addEventListener('storage', storage);
    return () => { sync.dispose(); clearInterval(timer); window.removeEventListener('online', refresh); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', visible); window.removeEventListener('storage', storage); };
  }, [session.user.id, key]);
  let legacy = false;
  try { legacy = !!localStorage.getItem(STORAGE_KEY) && !localStorage.getItem(`${key}.legacyImported`); } catch { /* App exposes storage errors. */ }
  const recovery: string[] = [];
  try { for (let i = 0; i < localStorage.length; i++) { const name = localStorage.key(i); if (name?.startsWith(`${key}.recovery.`)) recovery.push(name); } } catch { /* App exposes storage errors. */ }
  const controls = <section className="panel cloud-panel" aria-label="Cloud sync">
    <div><h2>Cloud sync</h2><p>Signed in as {session.user.email}</p><p role="status">{engine?.message || 'Connecting…'}</p></div>
    <div className="button-row"><button className="secondary" disabled={!engine} onClick={() => { void engine?.sync(); }}>Sync now</button><button className="text-link" onClick={() => { void cloudClient!.auth.signOut().then(({ error }) => { if (error) setError('Could not sign out. Try again.'); }); }}>Sign out</button></div>
    {legacy && !imported && <div className="cloud-import"><p>Your original browser-only Cleaning plan is still kept separately. Add it to this account to sync it. Existing account records with matching IDs are kept.</p><button className="secondary" onClick={() => {
      try {
        const raw = localStorage.getItem(key); const original = localStorage.getItem(STORAGE_KEY);
        if (!original) return;
        const next = mergeBackup(raw ? parsePlan(raw) : emptyPlan(), parsePlan(original));
        savePlan(localStorage, next, raw, key); localStorage.setItem(`${key}.legacyImported`, new Date().toISOString()); setImported(true); setEpoch(n => n + 1); void engine?.sync();
      } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not add the browser plan.'); }
    }}>Add this browser’s plan to my account</button></div>}
    {engine?.conflict && <div className="cloud-conflict" role="alert"><p>Cloud: {engine.conflict.plan.spaces.length} spaces, {engine.conflict.plan.tasks.length} tasks; saved {new Date(engine.conflict.updated_at).toLocaleString()}. Download a backup before choosing. Previous versions are also kept in this browser’s recovery copies.</p><div className="button-row"><button className="secondary" onClick={() => { void engine.resolve('cloud'); }}>Use cloud plan</button><button className="secondary" onClick={() => { void engine.resolve('device'); }}>Use this device’s plan</button></div></div>}
    {recovery.length > 0 && <details><summary>Recovery copies ({recovery.length})</summary>{recovery.map((name, index) => <button type="button" className="text-link" key={name} onClick={() => {
      const raw = localStorage.getItem(name); if (!raw) return;
      const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `cleaning-recovery-${index + 1}.json`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }}>Download recovery copy {index + 1}</button>)}</details>}
    {error && <p role="alert" className="error-text">{error}</p>}
  </section>;
  return <App key={epoch} storageKey={key} cloudControls={controls} onPlanSaved={() => { void engine?.sync(); }} />;
}

export default function CloudWorkspace() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!cloudClient);
  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    if (!cloudClient) return;
    let mounted = true;
    const started = generation.current;
    const { data: { subscription } } = cloudClient.auth.onAuthStateChange((_event, next) => { if (mounted) { generation.current++; setSession(next); setLoading(false); } });
    void cloudClient.auth.getSession().then(({ data, error }) => { if (mounted && generation.current === started) { setSession(data.session); setLoading(false); if (error) setError('Could not recover your account. Sign in again to sync.'); } }).catch(() => { if (mounted && generation.current === started) { setLoading(false); setError('Could not connect to your account. Your device plan is still safe.'); } });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);
  if (loading) return <main className="workspace"><p role="status">Connecting to your Cleaning account…</p></main>;
  if (session) return <AccountWorkspace key={session.user.id} session={session} />;
  const controls = <section className="panel cloud-panel" aria-label="Cloud sync"><h2>Sync across devices</h2><p>Your plan is saved on this device. Sign in with your existing All in One account to use cloud sync.</p>{cloudClient ? <form onSubmit={async event => {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form); setSigningIn(true); setError('');
    try { const { error } = await cloudClient!.auth.signInWithPassword({ email: String(values.get('email') || '').trim(), password: String(values.get('password') || '') }); if (error) setError('Sign-in failed. Check your email and password.'); else form.reset(); }
    catch { setError('Could not connect. Your device plan is still safe.'); }
    finally { setSigningIn(false); }
  }}><label>Email<input type="email" name="email" autoComplete="username" required /></label><label>Password<input type="password" name="password" autoComplete="current-password" required /></label><button className="primary" disabled={signingIn}>{signingIn ? 'Signing in…' : 'Sign in to sync'}</button></form> : <p>Cloud connection is not configured on this installation.</p>}{error && <p role="alert" className="error-text">{error}</p>}</section>;
  return <App key="device-only" cloudControls={controls} />;
}
