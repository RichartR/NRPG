'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Swords, LogIn, Plus } from 'lucide-react';
import Link from 'next/link';

export default function CombateMenu() {
  const [roomId, setRoomId] = useState('');
  const [roomMode, setRoomMode] = useState<'normal' | 'event'>('normal');
  const router = useRouter();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      router.push(`/combate/${roomId.trim()}`);
    }
  };

  const handleCreate = () => {
    const newRoom = Math.random().toString(36).substring(2, 8).toUpperCase();
    if (roomMode === 'event') {
      router.push(`/combate/${newRoom}?mode=event`);
    } else {
      router.push(`/combate/${newRoom}`);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-rojo-sangre/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-[550px] ninja-card-oro p-12 xl:p-16 relative z-10 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-oro/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

        <div className="flex flex-col items-center mb-12">
          <h1 className="ninja-title text-4xl xl:text-6xl text-center">CAMPO DE BATALLA</h1>
          <p className="text-oro/40 text-caption xl:text-xs font-black uppercase tracking-[0.3em] mt-4 text-center">CREA TU SALA O ÚNETE A LA UNA YA CREADA</p>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            type="button"
            onClick={() => setRoomMode('normal')}
            className={`flex-1 py-3 px-4 text-xs font-black uppercase tracking-widest border transition-all ${roomMode === 'normal'
                ? 'bg-oro text-black border-oro shadow-md shadow-oro/5'
                : 'border-oro/10 text-oro/60 hover:text-oro bg-black/20'
              }`}
            style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
          >
            Combate Normal
          </button>
          <button
            type="button"
            onClick={() => setRoomMode('event')}
            className={`flex-1 py-3 px-4 text-xs font-black uppercase tracking-widest border transition-all ${roomMode === 'event'
                ? 'bg-oro text-black border-oro shadow-md shadow-oro/5'
                : 'border-oro/10 text-oro/60 hover:text-oro bg-black/20'
              }`}
            style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
          >
            Combate de Evento
          </button>
        </div>

        <button
          onClick={handleCreate}
          className="w-full ninja-btn-oro flex items-center justify-center gap-4 py-5 px-6 text-xs xl:text-sm mb-10"
        >
          <Plus className="w-5 h-5" />
          INICIAR NUEVO DUELO
        </button>

        <form onSubmit={handleJoin} className="space-y-6">
          <div className="relative">
            <input
              type="text"
              required
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              className="w-full bg-black/60 border border-oro/20 text-oro py-5 px-6 text-center text-2xl xl:text-4xl tracking-[0.4em] font-black outline-none hover:border-oro/40 focus:border-oro/80 transition-all uppercase placeholder:tracking-normal placeholder:text-oro/10 selection:bg-oro/20"
              placeholder="CÓDIGO"
              maxLength={6}
              style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
            />
          </div>
          <button
            type="submit"
            className="w-full ninja-btn-rojo flex items-center justify-center gap-4 py-5 px-6 text-xs xl:text-sm shadow-lg shadow-rojo-sangre/20"
          >
            <LogIn className="w-5 h-5" />
            ENTRAR A LA SALA
          </button>
        </form>

        <div className="mt-12 text-center">
          <Link href="/" className="text-caption xl:text-xs font-black text-oro/40 hover:text-oro uppercase tracking-[0.4em] transition-all border-b border-oro/10 pb-1">
            RETROCEDER AL DASHBOARD
          </Link>
        </div>
      </div>
    </div>
  );
}
