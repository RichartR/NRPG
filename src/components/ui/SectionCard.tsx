import React from 'react';

interface SectionCardProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
  color?: 'orange' | 'blue' | 'red' | 'purple' | 'emerald';
}

export function SectionCard({ title, icon: Icon, children, className = '', headerAction, color = "orange" }: SectionCardProps) {
  const colorMap = {
    orange: "text-orange-500 bg-orange-500/10 border-orange-500/20 shadow-orange-500/5",
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20 shadow-blue-500/5",
    red: "text-red-500 bg-red-500/10 border-red-500/20 shadow-red-500/5",
    purple: "text-purple-500 bg-purple-500/10 border-purple-500/20 shadow-purple-500/5",
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/5"
  };

  return (
    <div className={`relative overflow-hidden bg-zinc-950/80 border border-zinc-800/50 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-2xl ${className}`}>
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl border ${colorMap[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">{title}</h2>
        </div>
        {headerAction}
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
