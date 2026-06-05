import React from 'react';

interface VitalBarProps {
  label: string;
  current: number;
  max: number;
  color: 'red' | 'blue';
  icon: React.ElementType;
}

export function VitalBar({ label, current, max, color, icon: Icon }: VitalBarProps) {
  const percentage = Math.min(Math.max((current / max) * 100, 0), 100);
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <span className={`text-caption font-black uppercase tracking-widest flex items-center gap-2 ${color === 'red' ? 'text-red-400' : 'text-blue-400'}`}>
          <Icon className="w-4 h-4" /> {label}
        </span>
        <span className="text-sm font-mono font-bold text-white">{current} <span className="text-zinc-600">/ {max}</span></span>
      </div>
      <div className="h-2.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 shadow-inner">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ease-out ${color === 'red' ? 'bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]'}`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
