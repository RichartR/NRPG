import React from 'react';

interface SectionCardProps {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
  color?: 'oro' | 'rojo-sangre';
}

export function SectionCard({ title, icon: Icon, children, className = '', headerAction, color = "oro" }: SectionCardProps) {
  return (
    <div className={`ninja-card-${color} p-8 xl:p-12 shadow-2xl ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 relative z-10">
        <div className="flex items-center gap-4">
          <img src="/assets/icons/shuriken.png" className="w-4 xl:w-7 h-auto object-contain" alt="icon" />
          <h2 className="ninja-title text-xl sm:text-2xl md:text-3xl xl:text-5xl">{title}</h2>
        </div>
        {headerAction && (
          <div className="flex justify-end">
            {headerAction}
          </div>
        )}
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

