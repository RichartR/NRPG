'use client';

import { create } from 'zustand';
import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  requireValidation?: boolean;
}

interface ConfirmState {
  isOpen: boolean;
  options: ConfirmOptions | null;
  resolve: (value: boolean) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  isOpen: false,
  options: null,
  resolve: () => {},
  confirm: (options) => {
    return new Promise((resolve) => {
      set({ isOpen: true, options, resolve: (val) => {
        resolve(val);
        set({ isOpen: false, options: null });
      } });
    });
  }
}));

 export function ConfirmContainer() {
  const { isOpen, options, resolve } = useConfirmStore();
  const [inputValue, setInputValue] = React.useState('');

  React.useEffect(() => {
    if (!isOpen) setInputValue('');
  }, [isOpen]);

  if (!isOpen || !options) return null;

  const isInvalid = options.requireValidation && inputValue.toLowerCase() !== 'borrar';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden"
      >
        {/* Background glow */}
        <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-20 ${options.variant === 'danger' ? 'bg-red-500' : 'bg-orange-500'}`} />
        
        <div className="relative z-10">
          <div className="flex items-center gap-5 mb-8">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${
              options.variant === 'danger' 
                ? 'bg-red-500/10 border-red-500/20 text-red-500' 
                : 'bg-orange-500/10 border-orange-500/20 text-orange-500'
            }`}>
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase italic text-white tracking-tight leading-none mb-1">
                {options.title || '¿Estás seguro?'}
              </h2>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] leading-none">
                Confirmación requerida
              </p>
            </div>
          </div>

          <p className="text-sm text-zinc-400 leading-relaxed mb-8 font-medium">
            {options.message}
          </p>

          {options.requireValidation && (
            <div className="mb-10 space-y-4 animate-in slide-in-from-top-2 duration-500">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 ml-1">Escribe <span className="text-red-500">borrar</span> para continuar</label>
              <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Escribe aquí..."
                className="w-full bg-black border border-zinc-800 rounded-2xl py-5 px-6 text-xs font-black text-white focus:border-red-500 outline-none transition-all placeholder:text-zinc-800"
                autoFocus
              />
            </div>
          )}

          <div className="flex gap-4">
            <button 
              onClick={() => resolve(false)}
              className="flex-1 px-6 py-4 bg-zinc-900/50 text-zinc-500 border border-zinc-800 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-zinc-800 hover:text-zinc-300 transition-all active:scale-95"
            >
              {options.cancelLabel || 'Cancelar'}
            </button>
            <button 
              onClick={() => resolve(true)}
              disabled={isInvalid}
              className={`flex-1 px-6 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 disabled:opacity-20 disabled:grayscale disabled:scale-100 disabled:cursor-not-allowed ${
                options.variant === 'danger' 
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/20' 
                  : 'bg-orange-600 hover:bg-orange-500 text-black shadow-orange-900/20'
              }`}
            >
              {options.confirmLabel || 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
