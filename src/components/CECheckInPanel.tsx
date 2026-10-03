import { ExternalLink } from 'lucide-react';

export function CECheckInPanel({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-slate-950 p-5 space-y-3">
      <p className="text-sm text-white/75">Sign in and submit your monthly check-in on the official CE website. Return here afterward to record completion and attach a screenshot.</p>
      <button type="button" onClick={onOpen} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-500">
        <ExternalLink size={18} /> Open Official CE Check-In
      </button>
      <p className="text-xs text-white/60">Opens checkin.ce-connect.com in your browser. Opening the site does not mark your check-in completed.</p>
    </div>
  );
}
