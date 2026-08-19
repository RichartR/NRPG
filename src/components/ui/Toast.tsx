'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }]
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      }));
    }, 6000);
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }));
  }
}));

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || toasts.length === 0) return null;

  const content = (
    <div className="fixed top-6 right-6 sm:top-8 sm:right-8 z-[9999999] flex flex-col gap-3 pointer-events-none max-w-lg w-[calc(100vw-3rem)]">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 border shadow-[0_15px_40px_rgba(0,0,0,0.8)] backdrop-blur-md animate-in slide-in-from-top-4 duration-300 transition-all ${
            toast.type === 'error'
              ? 'bg-red-950/95 border-red-500 text-red-100'
              : toast.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500 text-emerald-100'
              : 'bg-zinc-950/95 border-oro text-oro'
          }`}
          style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
        >
          {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
          {toast.type === 'error' && <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-oro shrink-0 mt-0.5" />}

          <div className="flex-1 min-w-0">
            <p className="text-xs font-black uppercase tracking-wider leading-relaxed break-words">
              {toast.message}
            </p>
          </div>

          <button
            onClick={() => removeToast(toast.id)}
            className="p-1 hover:bg-white/10 transition-all text-white/70 hover:text-white shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );

  return createPortal(content, document.body);
}
