import React, { useState } from 'react';
import { Bath, Check, Play, CalendarDays } from 'lucide-react';
import { Modal } from './forms';
import type { Plan, Space } from './model';
import { bathroomActivities, bathroomDue, type BathroomId } from './bathroom';

const displayDate = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
export function BathroomDashboard({ plan, today, setup, prepare, open, setOpen, blocked, error }: { plan: Plan; today: string; setup: (start: string) => boolean; prepare: (room: Space, ids: BathroomId[]) => void; open: boolean; setOpen: (open: boolean) => void; blocked: boolean; error: string }) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<BathroomId[]>([]);
  const room = plan.spaces.find(space => !space.archived && space.bathroom);
  const schedule = room?.bathroom;
  if (!room || !schedule || editing) return <section className="panel bathroom-setup" aria-label="Bathroom schedule setup">
    <div className="bathroom-brand"><span><Bath size={30} /></span><div><p className="eyebrow">Your first room</p><h2>Bathroom</h2></div></div>
    <p className="muted">A small daily reset, with the bigger jobs spaced out.</p>
    <div className="cadence-summary"><div><strong>Daily</strong><span>Toilet & sink wipe-downs</span></div><div><strong>Every two weeks</strong><span>Walls, cabinets & floor</span></div><div><strong>Monthly</strong><span>Shower</span></div></div>
    <form onSubmit={event => { event.preventDefault(); if (setup(String(new FormData(event.currentTarget).get('start')))) setEditing(false); }}><label>Bathroom start date<input type="date" name="start" required min={today} defaultValue={schedule?.start || today} /></label><p className="hint">Daily wipe-downs start on this date. Walls, cabinets and floor start two weeks later; shower cleaning starts one month later. Nothing is marked complete.</p>{error && <p role="alert" className="error-text">{error}</p>}<div className="button-row"><button className="primary" disabled={blocked}>{schedule ? 'Save start date' : 'Set up Bathroom'}</button>{editing && <button className="secondary" type="button" onClick={() => setEditing(false)}>Cancel</button>}</div></form>
  </section>;
  const due = bathroomActivities.filter(item => bathroomDue(schedule, item.id) <= today);
  const upcoming = bathroomActivities.filter(item => bathroomDue(schedule, item.id) > today).sort((a, b) => bathroomDue(schedule, a.id).localeCompare(bathroomDue(schedule, b.id)));
  return <>
    <div className="bathroom-dashboard"><section className="panel bathroom-today" aria-label="Bathroom today"><div className="bathroom-brand"><span><Bath size={30} /></span><div><p className="eyebrow">Your room</p><h2>{room.name}</h2></div><span className="bathroom-count">{due.length} due</span></div>
      <h3>Today's cleaning</h3>{due.length ? <ul className="bathroom-due-list">{due.map(item => <li key={item.id}><span className="due-dot" /><div><strong>{item.title}</strong><small>{item.cadence}{bathroomDue(schedule, item.id) < today ? ` · Due since ${displayDate(bathroomDue(schedule, item.id))}` : ''}</small></div></li>)}</ul> : <div className="bathroom-clear"><Check size={25} /><p>{schedule.start > today ? `Your schedule starts ${displayDate(schedule.start)}.` : 'Nothing due right now. Your next dates are below.'}</p></div>}
      <button className="primary" disabled={blocked || schedule.start > today} onClick={() => { setSelected(due.map(item => item.id)); setOpen(true); }}><Play size={17} />{due.length ? 'Start cleaning' : 'Choose extra cleaning'}</button><p className="hint">Review your tools, clock in, and put the phone down.</p>
    </section><section className="panel bathroom-upcoming" aria-label="Bathroom upcoming"><div className="section-heading"><h2>Upcoming</h2><CalendarDays size={20} /></div>{upcoming.length ? upcoming.map(item => <div className="upcoming-row" key={item.id}><div><strong>{item.title}</strong><small>{item.cadence}</small></div><span>{displayDate(bathroomDue(schedule, item.id))}</span></div>) : <p className="routine-hint">Your next dates will appear here after you finish today's work.</p>}</section></div>
    {!Object.keys(schedule.lastDone).length && <button className="text-link" disabled={blocked} onClick={() => setEditing(true)}>Change start date</button>}
    {open && <Modal title={`${room.name} · today's plan`} onClose={() => setOpen(false)}><p className="muted">Today's work is selected. Include any extras you'd like to do.</p>{['Daily', 'Every two weeks', 'Monthly'].map(cadence => <section key={cadence}><h3 className="session-subtitle">{cadence}</h3><div className="task-picker">{bathroomActivities.filter(item => item.cadence === cadence).map(item => <button key={item.id} className="picker-choice" aria-pressed={selected.includes(item.id)} onClick={() => setSelected(ids => ids.includes(item.id) ? ids.filter(id => id !== item.id) : [...ids, item.id])}><span>{item.title}<small className="activity-due">{bathroomDue(schedule, item.id) <= today ? 'Due now' : `Next ${displayDate(bathroomDue(schedule, item.id))}`}</small></span>{selected.includes(item.id) ? <Check size={18} /> : <span className="due-dot" />}</button>)}</div></section>)}<div className="form-actions"><button className="secondary" onClick={() => setOpen(false)}>Back</button><button className="primary" disabled={!selected.length || blocked} onClick={() => { setOpen(false); prepare(room, selected); }}>Get ready</button></div></Modal>}
  </>;
}
