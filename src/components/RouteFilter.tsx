import type { Job } from '../types';

export type RouteFilterType = 'today' | 'under_review' | 'revisions' | 'finished';

interface RouteFilterOption {
  key: RouteFilterType;
  label: string;
  count: number;
}

interface RouteFilterProps {
  activeFilter: RouteFilterType;
  onFilterChange: (filter: RouteFilterType) => void;
  counts: Record<RouteFilterType, number>;
}

const FILTER_OPTIONS: Array<{ key: RouteFilterType; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'revisions', label: 'Revisions' },
  { key: 'finished', label: 'Finished' },
];

export function filterJobsByType(jobs: Job[], filter: RouteFilterType): Job[] {
  return jobs.filter(job => {
    const s = job.status;
    switch (filter) {
      case 'today':
        return s !== 'finished' && s !== 'completed';
      case 'under_review':
        return s === 'under_review';
      case 'revisions':
        return s === 'revisit';
      case 'finished':
        return s === 'finished' || s === 'completed';
      default:
        return true;
    }
  });
}

export function RouteFilter({ activeFilter, onFilterChange, counts }: RouteFilterProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-1 -mx-1 px-1">
      {FILTER_OPTIONS.map(opt => {
        const isActive = activeFilter === opt.key;
        const count = counts[opt.key];
        return (
          <button
            key={opt.key}
            onClick={() => onFilterChange(opt.key)}
            className={`
              flex items-center gap-1.5 shrink-0 rounded-full px-3 py-1.5 text-xs font-bold
              transition-all min-h-[36px] select-none
              ${isActive
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-white/5 text-white/50 hover:text-white/70 hover:bg-white/10 border border-white/10'
              }
            `}
          >
            <span>{opt.label}</span>
            {count > 0 && (
              <span className={`
                inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-black
                ${isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-white/40'}
              `}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
