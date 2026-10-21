import React, { useState } from 'react';
import { Check, ListChecks, Pencil, Play } from 'lucide-react';
import type { Space } from './model';
import { Modal } from './forms';
import { activeRun, editRoutine, startRoutine, updateRun } from './routines';

export function RoomRoutine({ space, save, blocked, saveError }: { space: Space; save: (space: Space, message: string) => boolean; blocked: boolean; saveError: string }) {
  const [mode, setMode] = useState<'edit' | 'run' | null>(null);
  const [error, setError] = useState('');
  const run = activeRun(space);
  function apply(change: () => Space, message: string) {
    try { setError(''); return save(change(), message); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not update this routine.'); return false; }
  }
  return <section className="panel routine-panel" aria-label={`${space.name} routine`}>
    <div className="section-heading"><div><p className="eyebrow">Every visit, the same rhythm</p><h2>{space.name} routine</h2></div><button className="secondary small" disabled={blocked} onClick={() => { setError(''); setMode('edit'); }}><Pencil size={15} />{space.routine?.length ? 'Edit routine' : 'Build routine'}</button></div>
    <div className="routine-body">
      <p className="muted">Your repeatable checklist, in the order you want to clean. Start fresh each time you visit this room.</p>
      {space.routine?.length ? <ol className="routine-steps">{space.routine.map((step, index) => <li key={index}>{step}</li>)}</ol> : <p className="routine-hint">Add steps such as gathering supplies, clearing surfaces, and cleaning the floor.</p>}
      {run && <p className="routine-hint">In progress: {run.completed} of {run.steps.length} steps. Your place is saved.</p>}
      {(space.routine?.length || run) ? <button className="primary" disabled={blocked} onClick={() => { if (apply(() => startRoutine(space), run ? 'Routine resumed.' : 'Routine started. Progress saves after each step.')) setMode('run'); }}><Play size={17} />{run ? 'Continue routine' : 'Start routine'}</button> : null}
      {error && mode === null && <p className="error-text" role="alert">{error}</p>}
    </div>
    {mode === 'edit' && <Modal title={`${space.name} routine`} onClose={() => setMode(null)}><form onSubmit={event => {
      event.preventDefault(); const steps = String(new FormData(event.currentTarget).get('steps') || '').split(/\r?\n/).map(step => step.trim()).filter(Boolean);
      if (apply(() => editRoutine(space, steps), 'Room routine saved. Each new visit starts with these steps.')) setMode(null);
    }}><label>Routine steps<textarea name="steps" rows={8} maxLength={20100} defaultValue={space.routine?.join('\n')} placeholder={'Gather supplies\nClear the surfaces\nWipe counters\nClean the floor'} /></label><p className="hint">One step per line, in the order you follow. Up to 100 steps, 200 characters each. Remove lines to remove steps.</p>{run && <p className="hint">Changes apply to your next visit. The routine in progress keeps its original steps.</p>}{(error || saveError) && <p className="error-text" role="alert">{error || saveError}</p>}<div className="form-actions"><button className="secondary" type="button" onClick={() => setMode(null)}>Cancel</button><button className="primary" disabled={blocked}>Save routine</button></div></form></Modal>}
    {mode === 'run' && run && <Modal title={`${run.spaceName} · routine`} onClose={() => setMode(null)}>
      <div className="routine-progress"><span>{run.completed} of {run.steps.length} steps complete</span><progress value={run.completed} max={run.steps.length} aria-label="Routine progress" /></div>
      <div className="current-step"><ListChecks size={24} /><p className="eyebrow">{run.completed === run.steps.length ? 'All steps checked' : `Step ${run.completed + 1}`}</p><h3>{run.steps[run.completed] || 'Ready to finish this room.'}</h3></div>
      <ol className="routine-steps run-steps">{run.steps.map((step, index) => <li key={index} aria-current={index === run.completed ? 'step' : undefined} className={index < run.completed ? 'checked-step' : ''}>{index < run.completed && <Check size={14} aria-label="Complete" />}{step}</li>)}</ol>
      {(error || saveError) && <p className="error-text" role="alert">{error || saveError}</p>}
      <div className="button-row">{run.completed < run.steps.length ? <button className="primary" disabled={blocked} onClick={() => apply(() => updateRun(space, run.id, run.completed, 'next'), 'Step saved.')}><Check size={17} />Complete step</button> : <button className="primary" disabled={blocked} onClick={() => { if (apply(() => updateRun(space, run.id, run.completed, 'finish'), 'Room routine finished and saved in History.')) setMode(null); }}>Finish routine</button>}{run.completed > 0 && <button className="secondary" disabled={blocked} onClick={() => apply(() => updateRun(space, run.id, run.completed, 'back'), 'Last step unchecked.')}>Undo last step</button>}</div><button className="text-link" onClick={() => setMode(null)}>Pause for now · progress is saved</button>
    </Modal>}
  </section>;
}
