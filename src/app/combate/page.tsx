'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Swords, LogIn, Plus } from 'lucide-react';
import Link from 'next/link';

export default function CombateMenu() {
  const [roomId, setRoomId] = useState('');
  const router = useRouter();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      router.push(`/combate/${roomId.trim()}`);
    }
  };

  const handleCreate = () => {
    const newRoom = Math.random().toString(36).substring(2, 8).toUpperCase();
    router.push(`/combate/${newRoom}`);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-rojo-sangre/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-[550px] bg-black/60 backdrop-blur-md ninja-box ninja-border p-12 xl:p-16 shadow-2xl relative z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-oro/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        
        <div className="flex flex-col items-center mb-12">
          <div className="w-20 h-20 bg-rojo-sangre/10 border border-rojo-sangre/20 flex items-center justify-center mb-6" style={{ clipPath: 'polygon(20% 0, 80% 0, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0 80%, 0 20%)' }}>
            <Swords className="w-10 h-10 text-rojo-sangre" />
          </div>
          <h1 className="ninja-title text-4xl xl:text-6xl text-center">CAMPO DE BATALLA</h1>
          <p className="text-oro/40 text-caption xl:text-xs font-black uppercase tracking-[0.4em] mt-4 text-center">FORJA TU SALA O ÚNETE A LA LUCHA</p>
        </div>

        <button
          onClick={handleCreate}
          className="w-full flex items-center justify-center gap-4 bg-oro text-rojo-sangre py-5 px-6 font-black uppercase tracking-[0.2em] text-xs xl:text-sm transition-all mb-10 hover:brightness-110 active:scale-95 ninja-clip-md"
        >
          <Plus className="w-5 h-5" />
          INICIAR NUEVO DUELO
        </button>

        <div className="relative mb-10">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-oro/10"></div>
          </div>
          <div className="relative flex justify-center text-caption xl:text-xs">
            <span className="bg-black/80 px-6 text-oro/30 font-black uppercase tracking-[0.3em]">O RECLAMA TU LUGAR</span>
          </div>
        </div>

        <form onSubmit={handleJoin} className="space-y-6">
          <div className="relative">
            <input
              type="text"
              required
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              className="w-full bg-black/40 border border-oro/20 text-oro py-5 px-6 text-center text-2xl xl:text-4xl tracking-[0.4em] font-black outline-none focus:border-oro transition-all uppercase placeholder:tracking-normal placeholder:text-oro/10 selection:bg-oro/20"
              placeholder="CÓDIGO"
              maxLength={6}
              style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-rojo-sangre text-oro font-black py-5 px-6 transition-all flex items-center justify-center gap-4 uppercase tracking-[0.3em] text-xs xl:text-sm hover:brightness-125 active:scale-95 shadow-lg shadow-rojo-sangre/20 ninja-clip-md"
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
