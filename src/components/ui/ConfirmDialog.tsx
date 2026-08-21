'use client';

import { createPortal } from 'react-dom';
import { create } from 'zustand';
import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useScrollLock } from '@/hooks/useScrollLock';

interface ConfirmOptions {
  title?: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  requireValidation?: boolean;
  validationWord?: string;
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
  resolve: () => { },
  confirm: (options) => {
    return new Promise((resolve) => {
      set({
        isOpen: true, options, resolve: (val) => {
          resolve(val);
          set({ isOpen: false, options: null });
        }
      });
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

  const validWord = (options.validationWord || 'borrar').toLowerCase();
  const isInvalid = options.requireValidation && inputValue.toLowerCase() !== validWord;
  const isDanger = options.variant === 'danger';

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-300">
      <div
        className="w-full max-w-md p-8 sm:p-10 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden bg-black border-2 border-white/70"
        style={{
          clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)',
          backgroundImage: `radial-gradient(circle at center, rgba(214, 133, 45, 0.08) 0%, transparent 70%)`,
        }}
      >
        {/* Background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-35 bg-naranja-naruto/30" />

        <div className="relative z-10">
          <div
            className="ninja-clip-md p-5 mb-8 flex items-center gap-5 relative overflow-hidden border bg-neutral-900/60 border-white/40 shadow-[inset_0_0_15px_rgba(255,255,255,0.05)]"
          >
            {/* Inner Card Glow */}
            <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full blur-2xl opacity-40 bg-naranja-naruto/20" />

            <div className="relative z-10 flex items-center gap-5 w-full">
              <div className="w-11 h-11 rotate-45 flex items-center justify-center border shrink-0 bg-naranja-naruto/15 border-naranja-naruto/40 text-naranja-naruto shadow-[0_0_10px_rgba(214,133,45,0.2)]">
                <AlertCircle className="w-5 h-5 -rotate-45" />
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-caption font-black uppercase tracking-[0.25em] leading-none mb-1.5 block text-naranja-naruto">
                  Confirmación requerida
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white italic tracking-tight leading-normal uppercase">
                  {options.title || (isDanger ? 'Archivar Personaje' : '¿Estás seguro?')}
                </h2>
              </div>
            </div>
          </div>

          <div
            className="rounded-sm mb-8 px-5 py-4 bg-neutral-900/90 border border-neutral-800"
            style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
          >
            <p className="text-xs sm:text-sm text-white leading-relaxed font-medium">
              {(() => {
                const message = options.message;
                if (typeof message !== 'string') return message;
                const parts = message.split('**');
                return parts.map((part, i) => {
                  if (i % 2 !== 0) {
                    return <strong key={i} className="font-extrabold text-naranja-naruto">{part}</strong>;
                  }
                  return part;
                });
              })()}
            </p>
          </div>

          {options.requireValidation && (
            <div className="mb-10 space-y-4 animate-in slide-in-from-top-2 duration-500">
              <label className="text-caption font-black uppercase tracking-[0.2em] text-white/80 ml-1 block">
                Escribe <span className="text-naranja-naruto font-black">{options.validationWord || 'borrar'}</span> para continuar
              </label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Escribe aquí..."
                className="w-full py-4 px-6 text-xs text-white placeholder:text-neutral-500 bg-neutral-900 border border-neutral-700 focus:border-naranja-naruto focus:outline-none transition-all uppercase font-black"
                style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                autoFocus
              />
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => resolve(false)}
              className="flex-1 px-6 py-4 text-xs font-black uppercase tracking-[0.2em] bg-white hover:bg-white/90 text-naranja-naruto border border-white/80 cursor-pointer transition-all active:scale-95"
              style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
            >
              {options.cancelLabel || 'Cancelar'}
            </button>
            <button
              onClick={() => resolve(true)}
              disabled={isInvalid}
              className="flex-1 px-6 py-4 text-xs font-black uppercase tracking-[0.2em] bg-naranja-naruto hover:bg-naranja-naruto/90 text-white border border-naranja-naruto/50 transition-all shadow-[0_0_20px_rgba(214,133,45,0.25)] active:scale-95 disabled:opacity-30 disabled:grayscale disabled:scale-100 disabled:cursor-not-allowed cursor-pointer"
              style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
            >
              {options.confirmLabel || 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
