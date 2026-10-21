import React, { useState } from 'react';
import { Check, ChevronRight, House, Plus } from 'lucide-react';
import { Modal, type TaskInput } from './forms';
import type { Space } from './model';

const roomTasks: Record<string, { label: string; title: string }[]> = {
  kitchen: [{ label: 'Dishes', title: 'Wash dishes' }, { label: 'Counters', title: 'Wipe kitchen counters' }, { label: 'Sink', title: 'Clean the kitchen sink' }, { label: 'Stove', title: 'Clean the stovetop' }, { label: 'Floor', title: 'Clean the kitchen floor' }],
  bathroom: [{ label: 'Toilet', title: 'Clean the toilet' }, { label: 'Sink', title: 'Clean the bathroom sink' }, { label: 'Shower / tub', title: 'Clean the shower or tub' }, { label: 'Mirror', title: 'Clean the bathroom mirror' }, { label: 'Floor', title: 'Clean the bathroom floor' }],
  bedroom: [{ label: 'Bed', title: 'Make the bed' }, { label: 'Laundry', title: 'Put away laundry' }, { label: 'Surfaces', title: 'Dust bedroom surfaces' }, { label: 'Floor', title: 'Clean the bedroom floor' }],
  'living area': [{ label: 'Tidy up', title: 'Put things back in place' }, { label: 'Surfaces', title: 'Dust living area surfaces' }, { label: 'Floor', title: 'Clean the living area floor' }],
};
const defaults = ['Kitchen', 'Bathroom', 'Bedroom', 'Living area'];
const normalized = (name: string) => name.trim().toLowerCase();
export function TaskCreator({ spaces, today, onSave, onClose, saveError }: { spaces: Space[]; today: string; onSave: (inputs: TaskInput[], room: Space) => boolean; onClose: () => void; saveError: string }) {
  const [room, setRoom] = useState<Space | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [inputError, setInputError] = useState('');
  const [custom, setCustom] = useState('');
  const choices = [...spaces, ...defaults.filter(name => !spaces.some(space => normalized(space.name) === normalized(name))).map(name => ({ id: '', name, archived: false }))];
  function choose(space: Space) { setRoom(space.id ? space : { ...space, id: crypto.randomUUID() }); setSelected([]); setNotice(''); setInputError(''); }
  return <Modal title={room ? room.name : 'Add a task'} onClose={onClose}>
    {room ? <>
      <button className="text-link" onClick={() => { setRoom(null); setSelected([]); setNotice(''); setInputError(''); }}>← Choose another room</button>
      <p className="muted">What would you like to clean in {room.name}? Select your activities here.</p>
      <div className="task-picker">{[...(roomTasks[normalized(room.name)] || []), ...selected.filter(title => !(roomTasks[normalized(room.name)] || []).some(option => option.title === title)).map(title => ({ label: title, title }))].map(option => <button className="picker-choice" aria-pressed={selected.includes(option.title)} key={option.title} onClick={() => { setNotice(''); setSelected(current => current.includes(option.title) ? current.filter(title => title !== option.title) : [...current, option.title]); }}><span>{option.label}</span>{selected.includes(option.title) ? <Check size={18} /> : <Plus size={18} />}</button>)}</div>
      <form onSubmit={event => { event.preventDefault(); const form = event.currentTarget; const title = String(new FormData(form).get('title') || '').trim(); if (!title) { setInputError('Enter a task name.'); return; } setInputError(''); setNotice(''); setSelected(current => current.includes(title) ? current : [...current, title]); form.reset(); }}><label>Your own task<input name="title" maxLength={120} required placeholder="Add something else to clean" /></label><button className="text-link" type="submit"><Plus size={15} />Select task</button></form>
      <p className="hint">Adds one-time tasks for today, with a 10-minute estimate each. You can edit them later.</p>
      {notice && <p className="notice" role="status">{notice}</p>}
      {inputError && <p className="error-text" role="alert">{inputError}</p>}
      <div className="form-actions"><button type="button" className="secondary" onClick={onClose}>Close</button><button className="primary" disabled={!selected.length} onClick={() => { if (onSave(selected.map(title => ({ title, spaceId: room.id, minutes: 10, intervalDays: 0, due: today, reactivate: false })), room)) { setNotice(`${selected.length} task${selected.length === 1 ? '' : 's'} added to today's list.`); setSelected([]); } }}>Add selected tasks</button></div>
    </> : <>
      <p className="muted">Choose a room first. Its cleaning activities come next.</p>
      <div className="task-picker">{choices.map((space, index) => <button className="picker-choice" key={space.id || `suggested-${index}`} onClick={() => choose(space)}><House size={19} /><span>{space.name}</span><ChevronRight size={18} /></button>)}</div>
      <form onSubmit={event => { event.preventDefault(); const name = custom.trim(); if (name) choose(spaces.find(space => normalized(space.name) === normalized(name)) || { id: '', name, archived: false }); }}><label>Another room<input name="roomName" maxLength={80} value={custom} onChange={event => setCustom(event.target.value)} placeholder="e.g. Dining room" /></label><div className="form-actions"><button className="secondary" type="button" onClick={onClose}>Cancel</button><button className="primary" disabled={!custom.trim()}>Choose room</button></div></form>
    </>}
    {saveError && <p className="error-text" role="alert">{saveError}</p>}
  </Modal>;
}
