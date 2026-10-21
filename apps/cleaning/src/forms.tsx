import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { Space, Task } from './model';

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} onCancel={event => { event.preventDefault(); onClose(); }} aria-labelledby="dialog-title">
    <div className="dialog-header"><h2 id="dialog-title">{title}</h2><button className="icon-button" type="button" onClick={onClose} aria-label="Close dialog"><X size={20} /></button></div>
    {children}
  </dialog>;
}

export function SpaceForm({ space, onSave, onClose, saveError }: { space?: Space; onSave: (name: string) => void; onClose: () => void; saveError?: string }) {
  const [error, setError] = React.useState('');
  return <Modal title={space ? 'Edit space' : 'Add a space'} onClose={onClose}><form onSubmit={event => {
    event.preventDefault(); const name = String(new FormData(event.currentTarget).get('name') || '').trim();
    if (!name) { setError('Give this space a name.'); return; } onSave(name);
  }}>
    <p className="muted">A room or area you want to look after.</p>
    <label>Space name<input autoFocus name="name" required maxLength={80} defaultValue={space?.name} placeholder="e.g. Kitchen" /></label>
    {(error || saveError) && <p role="alert" className="error-text">{error || saveError}</p>}
    <div className="form-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" type="submit">Save space</button></div>
  </form></Modal>;
}

export type TaskInput = { title: string; spaceId: string; minutes: number; intervalDays: number; due: string; reactivate: boolean };
export function TaskForm({ task, spaces, spaceId, today, onSave, onClose, saveError, initialTitle, onBack }: { task?: Task; spaces: Space[]; spaceId: string; today: string; onSave: (input: TaskInput) => void; onClose: () => void; saveError?: string; initialTitle?: string; onBack?: () => void }) {
  const [error, setError] = React.useState('');
  return <Modal title={task ? 'Edit task' : 'Add a cleaning task'} onClose={onClose}><form onSubmit={event => {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const input = { title: String(data.get('title') || '').trim(), spaceId: String(data.get('space')), minutes: Number(data.get('minutes')), intervalDays: Number(data.get('interval')), due: String(data.get('due')), reactivate: data.get('reactivate') === 'on' };
    if (!input.title) { setError('Give this task a name.'); return; } onSave(input);
  }}>
    {onBack && <button className="text-link" type="button" onClick={onBack}>← Back to {spaces.find(space => space.id === spaceId)?.name}</button>}
    <label>Task name<input autoFocus name="title" required maxLength={120} defaultValue={task?.title || initialTitle} placeholder="e.g. Wipe the counters" /></label>
    <label>Space<select name="space" defaultValue={task?.spaceId || spaceId}>{spaces.map(space => <option key={space.id} value={space.id}>{space.name}</option>)}</select></label>
    <div className="form-grid"><label>Time estimate (minutes)<input name="minutes" type="number" required min={1} max={480} defaultValue={task?.minutes || 10} /></label><label>Next due<input name="due" type="date" required defaultValue={task?.due || today} /></label></div>
    <label>Repeat<select name="interval" defaultValue={task?.intervalDays ?? 7}><option value={0}>One time</option><option value={1}>Every day</option><option value={7}>Every week</option><option value={14}>Every 2 weeks</option><option value={30}>Every 30 days</option>{task && ![0, 1, 7, 14, 30].includes(task.intervalDays) && <option value={task.intervalDays}>Every {task.intervalDays} days</option>}</select></label>
    <p className="hint">Repeating tasks are scheduled again from the day you finish them.</p>
    {task?.done && <label className="checkbox-label"><input type="checkbox" name="reactivate" />Make this task active again</label>}
    {(error || saveError) && <p role="alert" className="error-text">{error || saveError}</p>}
    <div className="form-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" type="submit">Save task</button></div>
  </form></Modal>;
}
