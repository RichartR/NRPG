'use client';

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
    }, 5000);
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }));
  }
}));

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-4 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-4 px-6 py-4 rounded-2xl border shadow-2xl animate-in slide-in-from-right-full transition-all ${toast.type === 'success' ? 'bg-success-bg border-success-text/20 text-success-text' :
            toast.type === 'error' ? 'bg-error-bg border-error-text/20 text-error-text' :
              'bg-blue-300 border-blue-800/30 text-blue-800'
            }`}
        >
          {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {toast.type === 'error' && <XCircle className="w-5 h-5" />}
          {toast.type === 'info' && <Info className="w-5 h-5" />}

          <p className="text-xs font-black uppercase tracking-widest">{toast.message}</p>

          <button onClick={() => removeToast(toast.id)} className="ml-4 p-1 hover:bg-white/5 rounded-lg transition-all">
            <X className="w-4 h-4 opacity-50" />
          </button>
        </div>
      ))}
    </div>
  );
}
