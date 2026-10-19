import React, { useState } from 'react';
import { BLUEAI_EXPORT_MAX_BYTES, parseBlueAiExport, type BlueAiExport, type BlueAiExportRow } from './blueAiExport';

function ResultGroup({ title, rows }: { title: string; rows: BlueAiExportRow[] }) {
  return <section aria-label={title} className="mt-4">
    <h3 className="text-base font-bold">{title} ({rows.length})</h3>
    {rows.length === 0 && <p className="mt-1 text-sm opacity-70">No records in this export.</p>}
    <div className="mt-2 space-y-3">{rows.map(row => <article key={row.order_number} className="rounded-xl border border-white/15 bg-white/5 p-3">
      <h4 className="font-bold">{row.title || 'Untitled work order'}</h4>
      <p className="mt-1 text-sm opacity-80">Order {row.order_number} · {row.city || 'City not provided'}</p>
      <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
        <div><dt className="opacity-60">Pay as reported</dt><dd>{row.pay || 'Not provided'}</dd></div>
        <div><dt className="opacity-60">Schedule as reported</dt><dd>{row.schedule || 'Not provided'}</dd></div>
        <div><dt className="opacity-60">Source status</dt><dd>{row.status || 'Not provided'}</dd></div>
      </dl>
      {row.description && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{row.description}</p>}
    </article>)}</div>
  </section>;
}

export default function BlueAiResultsPanel() {
  const [result, setResult] = useState<BlueAiExport | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return <details className="rounded-2xl border border-white/15 bg-[#0C0A16] p-4 text-white">
    <summary className="cursor-pointer text-base font-bold">BlueAI results</summary>
    <p className="mt-3 text-sm text-white/70">Review a JSON export from BlueAI. Available listings remain separate from assigned work. Nothing is accepted or added to your calendar.</p>
    <label className="mt-3 flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 font-bold">
      {busy ? 'Reading export…' : 'Choose BlueAI export'}
      <input aria-label="Choose BlueAI export" type="file" accept=".json,application/json" disabled={busy} className="sr-only" onChange={async event => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = '';
        if (!file) return;
        setBusy(true); setError(''); setResult(null);
        try {
          if (file.size > BLUEAI_EXPORT_MAX_BYTES) throw new Error('Choose a JSON file smaller than 256 KB.');
          setResult(parseBlueAiExport(await file.text()));
        } catch (error) { setError(error instanceof Error ? error.message : 'Unable to read the export.'); }
        finally { setBusy(false); }
      }} />
    </label>
    <p className="mt-2 text-xs text-white/60">Read on this device only; no upload. This temporary preview clears when you leave Jobs. Source details may need verification; missing dates or times are not inferred.</p>
    {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
    {result && <div aria-live="polite" className="break-words">
      <ResultGroup title="Assigned work orders" rows={result.assigned_work_orders} />
      <ResultGroup title="Available jobs" rows={result.available_jobs} />
    </div>}
  </details>;
}
