import { TaskCreator } from './TaskCreator';
import { RoomRoutine } from './RoomRoutine';
import { activeRun } from './routines';
import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Archive, Check, CheckCheck, ChevronRight, Circle, Clock3, Download, History, House, LayoutGrid, Leaf, Pencil, Plus, RotateCcw, Sparkles, Upload } from 'lucide-react';
import { activeTasks, canUndo, completeTask, dayKey, dueTasks, frequency, mergeBackup, parsePlan, starterPlan, undoCompletion, type Plan, type Space, type Task } from './model';
import { readPlan, savePlan, STORAGE_KEY } from './storage';
import { SpaceForm, TaskForm, type TaskInput } from './forms';

type Page = 'today' | 'spaces' | 'history';
type Editor = { kind: 'space'; id?: string } | { kind: 'task'; id?: string } | null;
function initialPlan() { try { return readPlan(window.localStorage); } catch { return { plan: { version: 1, spaces: [], tasks: [], history: [] } as Plan, raw: null, error: 'Browser storage is unavailable. Changes cannot be saved on this device.' }; } }
function currentPage(): Page { const hash = window.location.hash.slice(1); return hash === 'spaces' || hash === 'history' ? hash : 'today'; }
function displayDay(day: string) { return new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }

export default function App() {
  const [loaded] = useState(initialPlan);
  const [plan, setPlan] = useState(loaded.plan);
  const raw = useRef(loaded.raw);
  const [readError, setReadError] = useState(loaded.error);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [page, setPage] = useState<Page>(currentPage);
  const [today, setToday] = useState(dayKey);
  const [editor, setEditor] = useState<Editor>(null);
  const [spaceId, setSpaceId] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const hash = () => { setPage(currentPage()); setEditor(null); };
    const date = () => setToday(dayKey());
    const storage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      const next = initialPlan(); raw.current = next.raw; setPlan(next.plan); setReadError(next.error); setEditor(null); setNotice('Plan updated from another tab.');
    };
    const timer = window.setInterval(date, 60000);
    window.addEventListener('hashchange', hash); window.addEventListener('focus', date); document.addEventListener('visibilitychange', date); window.addEventListener('storage', storage);
    return () => { clearInterval(timer); window.removeEventListener('hashchange', hash); window.removeEventListener('focus', date); document.removeEventListener('visibilitychange', date); window.removeEventListener('storage', storage); };
  }, []);

  function commit(next: Plan, message: string, recover = false): boolean {
    try {
      if (readError && !recover) throw new Error(readError);
      if (readError && raw.current !== null) window.localStorage.setItem(`${STORAGE_KEY}.recovery.${Date.now()}`, raw.current);
      raw.current = savePlan(window.localStorage, next, raw.current);
      setPlan(next); setReadError(''); setError(''); setNotice(message); return true;
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save this change.'); return false; }
  }
  function action(change: (current: Plan) => Plan, message: string) {
    try { commit(change(plan), message); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not apply this change.'); }
  }
  function saveSpace(name: string) {
    const id = editor?.id || crypto.randomUUID();
    const next = editor?.id ? { ...plan, spaces: plan.spaces.map(space => space.id === id ? { ...space, name } : space) } : { ...plan, spaces: [...plan.spaces, { id, name, archived: false }] };
    if (commit(next, 'Space saved on this device.')) { setEditor(null); setSpaceId(id); window.location.hash = 'spaces'; }
  }
  function saveTask(input: TaskInput, newRoom?: Space) {
    const previous = plan.tasks.find(task => task.id === editor?.id);
    const task: Task = { id: previous?.id || crypto.randomUUID(), spaceId: input.spaceId, title: input.title, minutes: input.minutes, intervalDays: input.intervalDays, due: input.due, done: input.reactivate || input.intervalDays > 0 ? false : previous?.done || false, archived: false, lastDay: input.reactivate ? null : previous?.lastDay || null, lastEvent: input.reactivate ? null : previous?.lastEvent || null };
    const next = { ...plan, spaces: newRoom && !plan.spaces.some(space => space.id === newRoom.id) ? [...plan.spaces, newRoom] : plan.spaces, tasks: previous ? plan.tasks.map(item => item.id === task.id ? task : item) : [...plan.tasks, task] };
    if (commit(next, 'Task saved on this device.')) { setEditor(null); if (newRoom) setSpaceId(newRoom.id); }
  }
  function downloadBackup() {
    try {
      const content = readError && raw.current !== null ? raw.current : JSON.stringify(plan, null, 2);
      const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `cleaning-backup-${today}.json`; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('Backup download started. Keep it somewhere safe.');
    } catch { setError('Could not download a backup in this browser.'); }
  }
  async function importBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    const beforeRead = raw.current;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('Backups must be smaller than 2 MB.');
      const imported = parsePlan(await file.text());
      if (raw.current !== beforeRead) throw new Error('Your plan changed while this file was being read. Import it again.');
      commit(mergeBackup(plan, imported), 'Backup imported. Existing items were kept; new items were added.', true);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not read this backup.'); }
  }
  const spaces = plan.spaces.filter(space => !space.archived);
  const tasks = activeTasks(plan);
  const due = dueTasks(plan, today);
  const filterSpaceId = spaces.some(space => space.id === spaceId) ? spaceId : 'all';
  const filteredDue = due.filter(task => filterSpaceId === 'all' || task.spaceId === filterSpaceId);
  const completedToday = plan.history.filter(event => event.day === today).length;
  const selectedSpace = spaces.find(space => space.id === spaceId) || spaces[0];
  const selectedTasks = tasks.filter(task => task.spaceId === selectedSpace?.id);
  const routineHistory = plan.spaces.flatMap(space => (space.runs || []).filter(run => run.finishedAt !== null)).sort((a, b) => b.finishedAt!.localeCompare(a.finishedAt!));
  const archivedSpaces = plan.spaces.filter(space => space.archived);
  const doneTask = (task: Task) => action(current => completeTask(current, task.id), `${task.title} completed. ${task.intervalDays ? 'Its next date is scheduled.' : 'One-time task finished.'}`);
  const taskRow = (task: Task) => <div className={`task-row ${task.done || task.lastDay === today ? 'task-done' : ''}`} key={task.id}>
    <button className="complete-button" type="button" aria-label={`Complete ${task.title}`} disabled={task.done || task.lastDay === today || !!readError} onClick={() => doneTask(task)}>{task.done || task.lastDay === today ? <Check size={22} /> : <Circle size={22} />}</button>
    <div className="task-content"><h3>{task.title}</h3><p>{plan.spaces.find(space => space.id === task.spaceId)?.name} <span>·</span> {frequency(task.intervalDays)} {task.done ? <span className="finished-label">Finished</span> : task.lastDay === today ? <span className="finished-label">Done today</span> : <span className={task.due < today ? 'overdue' : ''}>{task.due < today ? 'Overdue · ' : 'Due '}{displayDay(task.due)}</span>}</p></div>
    <span className="minutes"><Clock3 size={14} />{task.minutes}m</span><button className="icon-button" type="button" aria-label={`Edit ${task.title}`} onClick={() => setEditor({ kind: 'task', id: task.id })}><Pencil size={16} /></button>
    {page === 'spaces' && <button className="icon-button archive-button" type="button" aria-label={`Archive ${task.title}`} onClick={() => action(current => ({ ...current, tasks: current.tasks.map(item => item.id === task.id ? { ...item, archived: true } : item) }), 'Task archived. You can restore it below.')}><Archive size={16} /></button>}
  </div>;

  return <div className="cleaning-app">
    <header className="app-header"><div className="header-inner"><a className="back-link" href={import.meta.env.VITE_HALLWAY_URL || '/#home'}><ArrowLeft size={16} />Main menu</a><div className="app-brand"><span><Sparkles size={22} /></span><div><strong>Cleaning</strong><small>My personal workspace</small></div></div><button type="button" className="secondary backup-toggle" onClick={() => setBackupOpen(!backupOpen)} aria-expanded={backupOpen}><Download size={16} />Backup</button></div></header>
    <main className="workspace">
      <nav className="page-nav" aria-label="Cleaning navigation">{([['today', 'Today', Sparkles], ['spaces', 'Spaces', LayoutGrid], ['history', 'History', History]] as const).map(([id, label, Icon]) => <a href={`#${id}`} key={id} aria-current={page === id ? 'page' : undefined}><Icon size={17} />{label}</a>)}</nav>
      {backupOpen && <section className="panel backup-panel" aria-label="Backups"><div><h2>Keep a copy of your plan</h2><p>Saved in this browser only. It does not sync to an account or another device. Export a backup before clearing browser data. Imports add missing items and keep your existing versions.</p></div><div className="button-row"><button className="secondary" onClick={downloadBackup}><Download size={16} />Export backup</button><button className="secondary" onClick={() => importRef.current?.click()}><Upload size={16} />Import backup</button></div></section>}
      <input ref={importRef} type="file" accept="application/json,.json" aria-label="Import cleaning backup" className="file-input" onChange={importBackup} />
      {(readError || error) && <div className="error-banner" role="alert">{error || readError}{readError && <div className="button-row"><button className="secondary" onClick={downloadBackup}>Export existing data</button><button className="secondary" onClick={() => importRef.current?.click()}>Recover from backup</button></div>}</div>}
      {notice && <p role="status" className="notice"><CheckCheck size={16} />{notice}</p>}

      {page === 'today' && <>
        <section className="page-heading"><div><p className="eyebrow">{new Date(`${today}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p><h1>A little cleaner.<br /><span>A little lighter.</span></h1><p>Your home, one manageable task at a time.</p></div><button className="primary" disabled={!!readError} onClick={() => setEditor({ kind: 'task' })}><Plus size={18} />Add task</button></section>
        <section className="room-shortcuts" aria-label="Room routines"><div className="section-heading"><div><p className="eyebrow">Choose a room, follow your routine</p><h2>Your room routines</h2></div><a className="text-link" href="#spaces">Manage spaces <ChevronRight size={15} /></a></div>{spaces.length ? <div className="routine-room-grid">{spaces.map(space => <button className="room-shortcut" key={space.id} onClick={() => { setSpaceId(space.id); window.location.hash = 'spaces'; }}><House size={22} /><strong>{space.name}</strong><span>{activeRun(space) ? 'Routine in progress · Continue' : space.routine?.length ? `${space.routine.length} steps · Open routine` : 'Build this room’s routine'}</span><ChevronRight size={18} /></button>)}</div> : <p className="routine-hint">Add your first space below, then build the steps you follow every visit.</p>}</section><div className="stats-grid"><div className="stat"><span>Ready for today</span><strong>{due.length}<small>tasks</small></strong></div><div className="stat"><span>Time to set aside</span><strong>{due.reduce((sum, task) => sum + task.minutes, 0)}<small>min estimated</small></strong></div><div className="stat"><span>Completed today</span><strong>{completedToday}<small>tasks</small></strong></div></div>
        <div className="today-layout"><section className="panel task-panel"><div className="section-heading"><div><p className="eyebrow">Your next small steps</p><h2>Today's list</h2></div>{spaces.length > 0 && <label className="filter-label"><span className="sr-only">Filter today's tasks by space</span><select value={filterSpaceId} onChange={event => setSpaceId(event.target.value)}><option value="all">All spaces</option>{spaces.map(space => <option value={space.id} key={space.id}>{space.name}</option>)}</select></label>}</div>
          {!spaces.length ? <div className="empty-state"><span className="empty-icon"><House size={35} /></span><h3>Start with your own space.</h3><p>Add a room, then choose the tasks that make a difference to you.</p><div className="button-row"><button className="primary" disabled={!!readError} onClick={() => setEditor({ kind: 'space' })}><Plus size={17} />Add a space</button><button className="secondary" disabled={!!readError} onClick={() => { action(current => mergeBackup(current, starterPlan(today)), 'Starter plan added. These are suggested tasks; edit them to fit your home.'); setSpaceId('all'); }}>Use a starter plan</button></div><small>Starter plan: 3 spaces, 6 editable tasks. Nothing marked complete.</small></div>
          : filteredDue.length ? <div className="task-list">{filteredDue.map(taskRow)}</div> : <div className="empty-state compact"><span className="empty-icon"><CheckCheck size={30} /></span><h3>{tasks.length ? 'Nothing due here right now.' : 'Give your space its first task.'}</h3><p>{tasks.length ? 'Your next dates are waiting in Spaces. Add a task whenever you need one.' : 'Keep it small. A five-minute task is a good place to start.'}</p><button className="secondary" onClick={() => setEditor({ kind: 'task' })}><Plus size={17} />Add task</button></div>}
        </section><aside className="panel gentle-panel"><span className="leaf-icon"><Leaf size={28} /></span><h2>Build a rhythm<br />that works for you.</h2><p>Start at home. Find your pace. Your cleaning business can grow from what you learn here.</p><div className="aside-detail"><span>{spaces.length} spaces</span><span>{tasks.filter(task => !task.done).length} active tasks</span></div><a className="text-link" href="#spaces">See your spaces <ArrowUpRight size={16} /></a><div className="storage-note"><span className="status-dot" />Saved on this device<button className="text-link" onClick={() => setBackupOpen(true)}>Back up your plan <ChevronRight size={14} /></button></div></aside></div>
      </>}

      {page === 'spaces' && <>
        <section className="page-heading"><div><p className="eyebrow">Your home base</p><h1>Make space<br /><span>for your routine.</span></h1><p>Organize tasks by room or area. Adjust them as life changes.</p></div><button className="primary" disabled={!!readError} onClick={() => setEditor({ kind: 'space' })}><Plus size={18} />Add space</button></section>
        {spaces.length ? <><div className="space-tabs" aria-label="Choose a space">{spaces.map(space => <button type="button" className={selectedSpace?.id === space.id ? 'selected' : ''} key={space.id} onClick={() => setSpaceId(space.id)}><House size={17} />{space.name}<span>{tasks.filter(task => task.spaceId === space.id && !task.done).length}</span></button>)}</div>
        {selectedSpace && <><RoomRoutine key={selectedSpace.id} space={selectedSpace} blocked={!!readError} saveError={error || readError} save={(updated, message) => commit({ ...plan, spaces: plan.spaces.map(space => space.id === updated.id ? updated : space) }, message)} /><section className="panel task-panel"><div className="section-heading space-heading"><h2>{selectedSpace.name}</h2><div className="button-row"><button className="icon-button" aria-label={`Edit space ${selectedSpace.name}`} onClick={() => setEditor({ kind: 'space', id: selectedSpace.id })}><Pencil size={17} /></button><button className="icon-button" aria-label={`Archive space ${selectedSpace.name}`} onClick={() => action(current => ({ ...current, spaces: current.spaces.map(space => space.id === selectedSpace.id ? { ...space, archived: true } : space) }), 'Space archived with its tasks. You can restore it below.')}><Archive size={17} /></button><button className="primary small" disabled={!!readError} onClick={() => setEditor({ kind: 'task' })}><Plus size={16} />Add task</button></div></div>{selectedTasks.length ? selectedTasks.map(taskRow) : <div className="empty-state compact"><h3>A fresh start for this space.</h3><p>Add a task to give this room a routine.</p></div>}
          {plan.tasks.filter(task => task.spaceId === selectedSpace.id && task.archived).length > 0 && <details className="archived-list"><summary>Archived tasks</summary>{plan.tasks.filter(task => task.spaceId === selectedSpace.id && task.archived).map(task => <div className="restore-row" key={task.id}><span>{task.title}</span><button className="secondary small" onClick={() => action(current => ({ ...current, tasks: current.tasks.map(item => item.id === task.id ? { ...item, archived: false } : item) }), 'Task restored.')}><RotateCcw size={14} />Restore task</button></div>)}</details>}
        </section></>}</> : <section className="panel empty-state"><House size={34} /><h2>Your first space belongs here.</h2><p>Add a room or an area, like a kitchen, bedroom, or entryway.</p></section>}
        {archivedSpaces.length > 0 && <section className="archive-section"><button className="text-link" aria-expanded={showArchived} onClick={() => setShowArchived(!showArchived)}><Archive size={15} />Archived spaces ({archivedSpaces.length})</button>{showArchived && <div className="panel">{archivedSpaces.map(space => <div className="restore-row" key={space.id}><span>{space.name}</span><button className="secondary small" onClick={() => action(current => ({ ...current, spaces: current.spaces.map(item => item.id === space.id ? { ...item, archived: false } : item) }), 'Space and its active tasks restored.')}><RotateCcw size={14} />Restore space</button></div>)}</div>}</section>}
      </>}

      {page === 'history' && <>
        <section className="page-heading"><div><p className="eyebrow">The work you've put in</p><h1>Small steps.<br /><span>Real progress.</span></h1><p>Your completed tasks, with the space and time recorded.</p></div></section>
        <section className="panel history-panel routine-history" aria-label="Room routine history"><div className="section-heading"><h2>Room routines</h2><span className="count-label">{routineHistory.length} visits finished</span></div>{routineHistory.length ? routineHistory.map(run => <div className="history-row" key={run.id}><span className="history-check"><Check size={18} /></span><div><h3>{run.spaceName} routine</h3><p>{run.steps.length} steps · {new Date(run.finishedAt!).toLocaleString()}</p><details><summary>View completed steps</summary><ol className="routine-steps">{run.steps.map((step, index) => <li key={index}>{step}</li>)}</ol></details></div></div>) : <p className="routine-hint">Finish a room routine and the visit will be recorded here.</p>}</section><section className="panel history-panel"><div className="section-heading"><h2>Completion history</h2><span className="count-label">{plan.history.length} completed</span></div>{!plan.history.length ? <div className="empty-state"><History size={34} /><h3>A clean slate.</h3><p>Finish a task and it will appear here. No pressure to do it all at once.</p><a className="secondary" href="#today">Go to today's list</a></div> : plan.history.map(event => <div className="history-row" key={event.id}><span className="history-check"><Check size={18} /></span><div><h3>{event.title}</h3><p>{event.spaceName} · {new Date(event.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p></div><button className="secondary small" disabled={!canUndo(plan, event) || !!readError} title={canUndo(plan, event) ? 'Undo this completion and restore its schedule' : 'Task changed or a newer completion exists'} onClick={() => action(current => undoCompletion(current, event.id), 'Completion undone and the previous schedule restored.')}><RotateCcw size={14} />Undo</button></div>)}</section>
      </>}
      <footer className="workspace-footer"><span><Leaf size={14} />Personal cleaning, built around you.</span><button className="text-link" onClick={() => setBackupOpen(true)}>Stored in this browser · Backup options</button></footer>
    </main>
    {editor?.kind === 'space' && <SpaceForm space={plan.spaces.find(space => space.id === editor.id)} onClose={() => setEditor(null)} onSave={saveSpace} saveError={error || readError} />}
    {editor?.kind === 'task' && !editor.id && <TaskCreator spaces={spaces} today={today} onSave={saveTask} onClose={() => setEditor(null)} saveError={error || readError} />}
    {editor?.kind === 'task' && !!editor.id && spaces.length > 0 && <TaskForm task={plan.tasks.find(task => task.id === editor.id)} spaces={spaces} spaceId={selectedSpace?.id || spaces[0].id} today={today} onClose={() => setEditor(null)} onSave={saveTask} saveError={error || readError} />}
  </div>;
}
