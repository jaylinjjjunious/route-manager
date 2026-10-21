import React, { useEffect, useState } from 'react';
import { Clock3, Pause, Play, Check } from 'lucide-react';
import { Modal } from './forms';
import type { Space } from './model';
import { duration, suggestedTools, workingMs, type CleaningSession } from './sessions';

export function GetReady({ room, activities, start, close, error }: { room: Space; activities: string[]; start: (tools: string[]) => void; close: () => void; error: string }) {
  const [ready, setReady] = useState<string[]>([]);
  const tools = suggestedTools(activities);
  return <Modal title={`Get ready · ${room.name}`} onClose={close}>
    <p className="muted">Get your tools together, then clock in and put your phone down.</p>
    <h3 className="session-subtitle">Your plan</h3><ol className="routine-steps">{activities.map(item => <li key={item}>{item}</li>)}</ol>
    <h3 className="session-subtitle">Tools & supplies</h3><p className="hint">Suggestions to review. Check what you have ready; skip anything you don't need.</p>
    <div className="tools-list">{tools.map(tool => <label className="tool-row" key={tool}><input type="checkbox" checked={ready.includes(tool)} onChange={() => setReady(items => items.includes(tool) ? items.filter(item => item !== tool) : [...items, tool])} />{tool}</label>)}</div>
    {error && <p role="alert" className="error-text">{error}</p>}
    <p className="hint">Your start time is saved when you clock in. Closing or reloading the app won't stop the timer. Saved in this browser only.</p>
    <div className="form-actions"><button className="secondary" onClick={close}>Back to activities</button><button className="primary" onClick={() => start(ready)}><Play size={17} />Clock in</button></div>
  </Modal>;
}

export function WorkSession({ session, act, error }: { session: CleaningSession; act: (change: 'pause' | 'resume' | 'finish', result?: { completed: string[]; note: string }) => boolean; error: string }) {
  const [now, setNow] = useState(Date.now);
  const [finishing, setFinishing] = useState(false);
  const [completed, setCompleted] = useState<string[] | null>(null);
  useEffect(() => { const tick = () => setNow(Date.now()); const timer = window.setInterval(tick, 1000); window.addEventListener('focus', tick); return () => { clearInterval(timer); window.removeEventListener('focus', tick); }; }, []);
  return <section className="panel work-session" aria-label="Current cleaning session">
    <div className="section-heading"><div><p className="eyebrow">{session.pausedAt ? 'On a break' : 'You are clocked in'}</p><h2>{session.spaceName}</h2></div><Clock3 size={24} /></div>
    <div className="routine-body"><div className="session-timer" aria-label="Working time">{duration(workingMs(session, now))}</div><p className="muted">{session.pausedAt ? 'Paused time will not count toward your working time.' : 'Your plan is ready. Put the phone down and focus on cleaning.'}</p>
      <details className="session-details"><summary>See routine & tools</summary><ol className="routine-steps">{session.activities.map(item => <li key={item}>{item}</li>)}</ol><p className="muted">Tools checked ready: {session.tools.join(', ') || 'None checked'}</p></details>
      <div className="button-row"><button className="secondary" onClick={() => act(session.pausedAt ? 'resume' : 'pause')}>{session.pausedAt ? <Play size={17} /> : <Pause size={17} />}{session.pausedAt ? 'Resume cleaning' : 'Pause'}</button><button className="primary" onClick={() => { setCompleted(null); setFinishing(true); }}>Clock out</button></div>
      {error && !finishing && <p role="alert" className="error-text">{error}</p>}
    </div>
    {finishing && <Modal title={`Clock out · ${session.spaceName}`} onClose={() => setFinishing(false)}><form onSubmit={event => { event.preventDefault(); if (completed === null) return; const note = String(new FormData(event.currentTarget).get('note') || ''); if (act('finish', { completed, note })) setFinishing(false); }}>
      <p className="muted">How did it go? A quick check, then you're done.</p><div className="button-row finish-options"><button className="secondary" aria-pressed={completed !== null && completed.length === session.activities.length} type="button" onClick={() => setCompleted([...session.activities])}>All finished</button><button className="secondary" aria-pressed={completed !== null && completed.length < session.activities.length} type="button" onClick={() => setCompleted([])}>Some work remains</button></div>
      {completed !== null && completed.length < session.activities.length && <fieldset className="finish-checklist"><legend>Check only the activities you finished</legend>{session.activities.map(item => <label className="tool-row" key={item}><input type="checkbox" checked={completed.includes(item)} onChange={() => setCompleted(items => items!.includes(item) ? items!.filter(value => value !== item) : [...items!, item])} />{item}</label>)}</fieldset>}
      <label>Note (optional)<textarea name="note" rows={3} maxLength={1000} placeholder="Anything to remember next time?" /></label>
      {error && <p role="alert" className="error-text">{error}</p>}<div className="form-actions"><button className="secondary" type="button" onClick={() => setFinishing(false)}>Keep session open</button><button className="primary" disabled={completed === null}>Save & clock out</button></div>
    </form></Modal>}
  </section>;
}

export function SessionHistory({ sessions }: { sessions: CleaningSession[] }) {
  const finished = sessions.filter(s => s.endedAt).sort((a, b) => b.endedAt!.localeCompare(a.endedAt!));
  return <section className="panel history-panel routine-history" aria-label="Cleaning session history"><div className="section-heading"><h2>Cleaning sessions</h2><span className="count-label">{finished.length} clocked out</span></div>{finished.length ? finished.map(s => <div className="history-row" key={s.id}><span className="history-check"><Check size={18} /></span><div><h3>{s.spaceName}</h3><p>{duration(workingMs(s))} working · {new Date(s.endedAt!).toLocaleString()}</p><p>{s.completed.length} of {s.activities.length} activities finished</p><details className="session-details"><summary>Session details</summary><p className="muted">Clock in: {new Date(s.startedAt).toLocaleString()}<br />Clock out: {new Date(s.endedAt!).toLocaleString()}<br />Paused: {duration(s.pausedMs)}</p><ul className="routine-steps">{s.activities.map(item => <li key={item}>{item} — {s.completed.includes(item) ? 'Finished' : 'Still to do'}</li>)}</ul><p className="muted">Tools checked ready: {s.tools.join(', ') || 'None checked'}</p>{s.note && <p className="session-note">{s.note}</p>}</details></div></div>) : <p className="routine-hint">Clock out of a cleaning session to see its time and notes here.</p>}</section>;
}
