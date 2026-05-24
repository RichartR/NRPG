'use client';

import { Settings } from 'lucide-react';

interface AdminViewSelectorProps {
  isAdmin: boolean;
  viewMode: 'player' | 'admin';
  onViewModeChange: (mode: 'player' | 'admin') => void;
  title?: string;
}

export default function AdminViewSelector({
  isAdmin,
  viewMode,
  onViewModeChange,
  title = 'Panel de Control Administrativo',
}: AdminViewSelectorProps) {
  if (!isAdmin) return null;

  return (
    <section className="w-full max-w-[1750px] mx-auto mb-4 sm:mb-6 ninja-card-oro p-6 sm:p-8 xl:p-10 animate-in slide-in-from-top duration-500">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-oro/10">
        <Settings className="w-5 h-5 text-oro" />
        <h2 className="text-sm sm:text-base font-black text-oro uppercase tracking-[0.2em]">{title}</h2>
      </div>

      <div className="flex gap-2 p-1.5 bg-black/40 border border-oro/10 ninja-box w-full sm:w-auto sm:inline-flex justify-center">
        <button
          onClick={() => onViewModeChange('player')}
          className={`flex-1 sm:flex-initial text-center px-4 sm:px-10 py-3 xl:py-4 font-black uppercase tracking-[0.2em] transition-all text-[9px] sm:text-[10px] xl:text-xs ${
            viewMode === 'player'
              ? 'bg-oro text-rojo-sangre shadow-lg'
              : 'text-oro/40 hover:text-oro hover:bg-oro/5'
          }`}
          style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
        >
          VISTA USUARIO
        </button>
        <button
          onClick={() => onViewModeChange('admin')}
          className={`flex-1 sm:flex-initial text-center px-4 sm:px-10 py-3 xl:py-4 font-black uppercase tracking-[0.2em] transition-all text-[9px] sm:text-[10px] xl:text-xs ${
            viewMode === 'admin'
              ? 'bg-oro text-rojo-sangre shadow-lg'
              : 'text-oro/40 hover:text-oro hover:bg-oro/5'
          }`}
          style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
        >
          MODO ADMINISTRADOR
        </button>
      </div>
    </section>
  );
}
