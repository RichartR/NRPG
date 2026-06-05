'use client';

import { create } from 'zustand';
import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useScrollLock } from '@/hooks/useScrollLock';

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

  // Prevent background scrolling when confirmation modal is open
  useScrollLock(isOpen);

  React.useEffect(() => {
    if (!isOpen) setInputValue('');
  }, [isOpen]);

  if (!isOpen || !options) return null;

  const isInvalid = options.requireValidation && inputValue.toLowerCase() !== 'borrar';
  const isDanger = options.variant === 'danger';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className={`w-full max-w-md p-10 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden ${
          isDanger ? 'ninja-card-rojo' : 'ninja-card-oro'
        }`}
        style={{
          backgroundColor: 'var(--negro-primario)',
          backgroundImage: isDanger
            ? `radial-gradient(circle at center, rgba(103, 9, 9, 0.15) 0%, transparent 70%), url('/assets/ui/bg-list.jpg')`
            : `radial-gradient(circle at center, rgba(255, 230, 159, 0.05) 0%, transparent 70%), url('/assets/ui/bg-list.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Background glow */}
        <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-35 ${
          isDanger ? 'bg-rojo-sangre/40' : 'bg-oro/20'
        }`} />
        
        <div className="relative z-10">
          <div 
            className={`ninja-clip-md p-5 mb-8 flex items-center gap-5 relative overflow-hidden border ${
              isDanger 
                ? 'bg-rojo-sangre/[0.04] border-rojo-sangre/20 shadow-[inset_0_0_15px_rgba(103,9,9,0.05)]' 
                : 'bg-oro/[0.02] border-oro/15 shadow-[inset_0_0_15px_rgba(255,230,159,0.03)]'
            }`}
          >
            {/* Inner Card Glow */}
            <div className={`absolute -top-12 -right-12 w-24 h-24 rounded-full blur-2xl opacity-40 ${
              isDanger ? 'bg-rojo-sangre/20' : 'bg-oro/10'
            }`} />

            <div className="relative z-10 flex items-center gap-5 w-full">
              <div className={`w-11 h-11 rotate-45 flex items-center justify-center border shrink-0 ${
                isDanger 
                  ? 'bg-rojo-sangre/15 border-rojo-sangre/30 text-rojo-sangre/80 shadow-[0_0_10px_rgba(103,9,9,0.15)]' 
                  : 'bg-oro/10 border-oro/20 text-oro/80 shadow-[0_0_10px_rgba(255,230,159,0.15)]'
              }`}>
                <AlertCircle className="w-5 h-5 -rotate-45" />
              </div>
              <div className="flex flex-col justify-center">
                <span className={`text-caption font-black uppercase tracking-[0.25em] leading-none mb-1.5 block ${
                  isDanger ? 'text-rojo-sangre/65' : 'text-oro-sombra/70'
                }`}>
                  Confirmación requerida
                </span>
                <h2 className="ninja-title text-xl sm:text-2xl italic tracking-tight leading-normal">
                  {options.title || (isDanger ? 'Archivar Personaje' : '¿Estás seguro?')}
                </h2>
              </div>
            </div>
          </div>

          <div className="rounded-sm mb-8 px-4 py-4 bg-white/30 border border-white/20 backdrop-blur-sm" style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}>
            <p className="text-xs sm:text-sm text-[#050309] leading-relaxed font-semibold">
              {options.message}
            </p>
          </div>

          {options.requireValidation && (
            <div className="mb-10 space-y-4 animate-in slide-in-from-top-2 duration-500">
              <label className="text-caption font-black uppercase tracking-[0.2em] text-[#050309]/60 ml-1 block">
                Escribe <span className={`${isDanger ? 'text-rojo-sangre' : 'text-oro-sombra'} font-black`}>borrar</span> para continuar
              </label>
              <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Escribe aquí..."
                className="w-full ninja-input py-4 px-6 text-xs text-oro placeholder:text-oro/20"
                autoFocus
              />
            </div>
          )}

          <div className="flex gap-4">
            <button 
              onClick={() => resolve(false)}
              className="flex-1 px-6 py-4 ninja-btn-ghost text-xs cursor-pointer"
            >
              {options.cancelLabel || 'Cancelar'}
            </button>
            <button 
              onClick={() => resolve(true)}
              disabled={isInvalid}
              className={`flex-1 px-6 py-4 text-xs transition-all shadow-xl active:scale-95 disabled:opacity-20 disabled:grayscale disabled:scale-100 disabled:cursor-not-allowed cursor-pointer ${
                isDanger 
                  ? 'ninja-btn-rojo' 
                  : 'ninja-btn-oro'
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
