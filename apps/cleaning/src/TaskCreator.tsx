import React, { useState } from 'react';
import { ChevronRight, House, Plus } from 'lucide-react';
import { Modal, TaskForm, type TaskInput } from './forms';
import type { Space } from './model';

const roomTasks: Record<string, { label: string; title: string }[]> = {
  kitchen: [{ label: 'Dishes', title: 'Wash dishes' }, { label: 'Counters', title: 'Wipe kitchen counters' }, { label: 'Sink', title: 'Clean the kitchen sink' }, { label: 'Stove', title: 'Clean the stovetop' }, { label: 'Floor', title: 'Clean the kitchen floor' }],
  bathroom: [{ label: 'Toilet', title: 'Clean the toilet' }, { label: 'Sink', title: 'Clean the bathroom sink' }, { label: 'Shower / tub', title: 'Clean the shower or tub' }, { label: 'Mirror', title: 'Clean the bathroom mirror' }, { label: 'Floor', title: 'Clean the bathroom floor' }],
  bedroom: [{ label: 'Bed', title: 'Make the bed' }, { label: 'Laundry', title: 'Put away laundry' }, { label: 'Surfaces', title: 'Dust bedroom surfaces' }, { label: 'Floor', title: 'Clean the bedroom floor' }],
  'living area': [{ label: 'Tidy up', title: 'Put things back in place' }, { label: 'Surfaces', title: 'Dust living area surfaces' }, { label: 'Floor', title: 'Clean the living area floor' }],
};
const defaults = ['Kitchen', 'Bathroom', 'Bedroom', 'Living area'];
const normalized = (name: string) => name.trim().toLowerCase();
export function TaskCreator({ spaces, today, onSave, onClose, saveError }: { spaces: Space[]; today: string; onSave: (input: TaskInput, room: Space) => void; onClose: () => void; saveError: string }) {
  const [room, setRoom] = useState<Space | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [custom, setCustom] = useState('');
  const choices = [...spaces, ...defaults.filter(name => !spaces.some(space => normalized(space.name) === normalized(name))).map(name => ({ id: '', name, archived: false }))];
  function choose(space: Space) { setRoom(space.id ? space : { ...space, id: crypto.randomUUID() }); }
  if (room && title !== null) return <TaskForm spaces={[room]} spaceId={room.id} initialTitle={title} today={today} onSave={input => onSave(input, room)} onClose={onClose} onBack={() => setTitle(null)} saveError={saveError} />;
  return <Modal title={room ? room.name : 'Add a task'} onClose={onClose}>
    {room ? <>
      <button className="text-link" onClick={() => { setRoom(null); setTitle(null); }}>← Choose another room</button>
      <p className="muted">What would you like to clean in {room.name}?</p>
      <div className="task-picker">{(roomTasks[normalized(room.name)] || []).map(option => <button className="picker-choice" key={option.label} onClick={() => setTitle(option.title)}><span>{option.label}</span><ChevronRight size={18} /></button>)}<button className="picker-choice custom-choice" onClick={() => setTitle('')}><Plus size={18} /><span>Write my own task</span><ChevronRight size={18} /></button></div>
      <p className="hint">Choose an activity, then adjust its name, time and repeat schedule. Nothing is saved until you select Save task.</p>
    </> : <>
      <p className="muted">Choose a room first. Its cleaning activities come next.</p>
      <div className="task-picker">{choices.map((space, index) => <button className="picker-choice" key={space.id || `suggested-${index}`} onClick={() => choose(space)}><House size={19} /><span>{space.name}</span><ChevronRight size={18} /></button>)}</div>
      <form onSubmit={event => { event.preventDefault(); const name = custom.trim(); if (name) choose(spaces.find(space => normalized(space.name) === normalized(name)) || { id: '', name, archived: false }); }}><label>Another room<input name="roomName" maxLength={80} value={custom} onChange={event => setCustom(event.target.value)} placeholder="e.g. Dining room" /></label><div className="form-actions"><button className="secondary" type="button" onClick={onClose}>Cancel</button><button className="primary" disabled={!custom.trim()}>Choose room</button></div></form>
    </>}
    {saveError && <p className="error-text" role="alert">{saveError}</p>}
  </Modal>;
}
