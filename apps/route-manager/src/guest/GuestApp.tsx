import React, { useEffect, useState, type FormEvent } from 'react';
import { hallwayUrl } from '../utils/roomLocation';
import { guestDirections, guestToday, readGuestPlan, writeGuestPlan, type GuestJob, type GuestPlan } from './guestStorage';

const button = 'rounded-xl border border-white/20 px-4 py-3 font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-blue-400';
const field = 'mt-2 w-full rounded-xl border border-white/20 bg-slate-900 px-4 py-3 text-white';
const emptyPlan: GuestPlan = { version: 1, startAddress: '', jobs: [] };

export default function GuestApp({ onSignIn }: { onSignIn: () => void }) {
  const [initial] = useState(() => {
    try { return { plan: readGuestPlan(), error: '' }; }
    catch { return { plan: emptyPlan, error: 'Your guest plan could not be read. Saved data has been left untouched. Reload to retry.' }; }
  });
  const [plan, setPlan] = useState(initial.plan);
  const [error, setError] = useState(initial.error);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState(window.location.hash === '#jobs' ? 'jobs' : 'today');
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState(guestToday);
  const [startAddress, setStartAddress] = useState(plan.startAddress);

  useEffect(() => {
    const sync = () => setTab(window.location.hash === '#jobs' ? 'jobs' : 'today');
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  function save(next: GuestPlan, notice: string): boolean {
    if (initial.error) return false;
    try {
      writeGuestPlan(next);
      setPlan(next);
      setError('');
      setMessage(notice);
      return true;
    } catch {
      setError('Could not save in this browser. Your changes have not been applied. Check browser storage and try again.');
      return false;
    }
  }

  function openForm(job?: GuestJob) {
    setEditing(job?.id ?? null);
    setTitle(job?.title ?? ''); setAddress(job?.address ?? ''); setDate(job?.date ?? guestToday());
    setAdding(true); setMessage('');
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !address.trim() || !date) return;
    if (!editing && plan.jobs.length >= 1000) { setError('This guest workspace supports up to 1,000 jobs.'); return; }
    const job: GuestJob = { id: editing ?? crypto.randomUUID(), title: title.trim(), address: address.trim(), date,
      completed: editing ? plan.jobs.find(item => item.id === editing)?.completed ?? false : false };
    const jobs = editing ? plan.jobs.map(item => item.id === editing ? job : item) : [...plan.jobs, job];
    if (save({ ...plan, jobs }, editing ? 'Job updated.' : 'Job added.')) setAdding(false);
  }

  const today = guestToday();
  const visible = plan.jobs.filter(job => tab === 'jobs' || job.date <= today)
    .sort((a, b) => Number(a.completed) - Number(b.completed) || a.date.localeCompare(b.date));
  const remaining = plan.jobs.filter(job => !job.completed && job.date <= today).length;

  return <div className="min-h-dvh bg-slate-950 text-slate-100">
    <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/95 px-4 py-4">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
        <a href={hallwayUrl()} className="font-semibold text-blue-300">← Main menu</a>
        <span className="font-black">All in One · Route Manager</span>
        <button type="button" onClick={onSignIn} className={button}>Sign in</button>
      </div>
    </header>
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 pb-28">
      <section aria-label="Guest workspace" className="rounded-2xl border border-blue-400/30 bg-blue-400/10 p-5">
        <h1 className="text-2xl font-black">Guest workspace</h1>
        <p className="mt-2 text-sm text-slate-300">Plan jobs and open directions without signing in. Guest jobs stay in this browser, separate from account data.</p>
        <p className="mt-2 text-sm text-slate-400">Cloud sync, account jobs, proof uploads, inventory and admin tools require sign-in. Anyone using this browser can access its guest plan. Clearing browser data removes it.</p>
      </section>

      {error && <p role="alert" className="rounded-xl border border-red-400/40 bg-red-400/10 p-4 text-red-200">{error}</p>}
      {message && <p role="status" className="text-emerald-300">{message}</p>}

      {tab === 'today' && <section className="rounded-2xl border border-white/10 p-5">
        <h2 className="text-xl font-bold">Today</h2>
        <p className="mt-2 text-slate-300">{remaining} unfinished {remaining === 1 ? 'job' : 'jobs'} due today or earlier</p>
        <form onSubmit={event => { event.preventDefault(); save({ ...plan, startAddress: startAddress.trim() }, 'Starting address saved.'); }} className="mt-4">
          <label htmlFor="guest-start" className="text-sm font-semibold">Starting address (optional)</label>
          <input id="guest-start" value={startAddress} onChange={event => setStartAddress(event.target.value)} maxLength={500} className={field} placeholder="Where your route begins" />
          <button className={`${button} mt-3`} disabled={!!initial.error}>Save starting address</button>
        </form>
      </section>}

      <section aria-label="Guest jobs" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{tab === 'today' ? "Today's jobs" : 'All jobs'}</h2>
          <button type="button" onClick={() => openForm()} disabled={!!initial.error} className={`${button} bg-blue-600`}>Add job</button>
        </div>

        {adding && <form onSubmit={submit} aria-label={editing ? 'Edit guest job' : 'Add guest job'} className="space-y-4 rounded-2xl border border-blue-400/40 p-5">
          <h3 className="font-bold">{editing ? 'Edit job' : 'Add job'}</h3>
          <label className="block text-sm font-semibold" htmlFor="guest-title">Job name
            <input id="guest-title" autoFocus required maxLength={200} value={title} onChange={event => setTitle(event.target.value)} className={field} />
          </label>
          <label className="block text-sm font-semibold" htmlFor="guest-address">Destination address
            <input id="guest-address" required maxLength={500} value={address} onChange={event => setAddress(event.target.value)} className={field} />
          </label>
          <label className="block text-sm font-semibold" htmlFor="guest-date">Date
            <input id="guest-date" required type="date" value={date} onChange={event => setDate(event.target.value)} className={field} />
          </label>
          <div className="flex gap-3"><button className={`${button} bg-blue-600`}>Save job</button><button type="button" onClick={() => setAdding(false)} className={button}>Cancel</button></div>
        </form>}

        {!visible.length && <p className="rounded-2xl border border-dashed border-white/20 p-6 text-slate-400">{tab === 'today' ? 'No jobs due. Add a job to start planning, or open Jobs to see future work.' : 'No guest jobs yet. Add your first job to start planning.'}</p>}
        {visible.map(job => <article key={job.id} aria-label={job.title} className="space-y-3 rounded-2xl border border-white/10 bg-slate-900 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-bold">{job.title}</h3><span className={job.completed ? 'text-emerald-300' : 'text-blue-300'}>{job.completed ? 'Completed' : 'To do'}</span></div>
          <p className="text-slate-300">{job.address}</p><p className="text-sm text-slate-400">Scheduled: {job.date}</p>
          <div className="flex flex-wrap gap-2">
            <a href={guestDirections(job, plan.startAddress)} target="_blank" rel="noopener noreferrer" className={button}>Directions</a>
            <button type="button" className={button} onClick={() => save({ ...plan, jobs: plan.jobs.map(item => item.id === job.id ? { ...item, completed: !item.completed } : item) }, job.completed ? 'Job reopened.' : 'Job marked complete.')}>{job.completed ? 'Reopen job' : 'Mark complete'}</button>
            <button type="button" className={button} onClick={() => openForm(job)}>Edit</button>
          </div>
        </article>)}
      </section>
    </main>
    <nav aria-label="Guest navigation" className="fixed inset-x-0 bottom-0 flex justify-center gap-3 border-t border-white/10 bg-slate-950 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <a href="#dashboard" aria-current={tab === 'today' ? 'page' : undefined} className={`${button} ${tab === 'today' ? 'bg-blue-600' : ''}`}>Today</a>
      <a href="#jobs" aria-current={tab === 'jobs' ? 'page' : undefined} className={`${button} ${tab === 'jobs' ? 'bg-blue-600' : ''}`}>Jobs</a>
    </nav>
  </div>;
}
