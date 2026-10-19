import type { TravelMode } from '../types';

interface BusModeToggleProps {
  travelMode: TravelMode;
  onModeChange: (mode: TravelMode) => void;
  className?: string;
}

export function BusModeToggle({ travelMode, onModeChange, className = '' }: BusModeToggleProps) {
  const modes: Array<{ value: TravelMode; label: string; icon: string }> = [
    { value: 'bicycling', label: 'Bike', icon: '🚲' },
    { value: 'transit', label: 'Bus', icon: '🚌' },
  ];

  return (
    <div className={`inline-flex rounded-lg border border-white/10 bg-white/5 p-0.5 ${className}`}>
      {modes.map(m => (
        <button
          key={m.value}
          onClick={() => onModeChange(m.value)}
          className={`
            flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all
            ${travelMode === m.value
              ? 'bg-cyan-500/20 text-cyan-300 shadow-sm shadow-cyan-500/10'
              : 'text-white/50 hover:text-white/70'
            }
          `}
        >
          <span>{m.icon}</span>
          {m.label}
        </button>
      ))}
    </div>
  );
}
