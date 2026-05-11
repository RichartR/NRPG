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
    <div className="min-h-screen bg-zinc-950 p-8 flex flex-col items-center justify-center">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-500/5 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 backdrop-blur-xl shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-4">
            <Swords className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter">Sala de Combate</h1>
          <p className="text-zinc-400 text-sm mt-2 text-center">Únete a una sala existente o crea una nueva para iniciar el duelo en tiempo real.</p>
        </div>

        <button
          onClick={handleCreate}
          className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white py-4 px-4 rounded-xl font-medium transition-colors mb-6 border border-zinc-700"
        >
          <Plus className="w-5 h-5" />
          Crear Nueva Sala
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-zinc-900/80 px-4 text-zinc-500">O unirse a una</span>
          </div>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <input
              type="text"
              required
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl py-4 px-4 text-center text-xl tracking-[0.2em] font-mono focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 uppercase placeholder:tracking-normal placeholder:text-zinc-600"
              placeholder="CÓDIGO DE SALA"
              maxLength={6}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            Entrar a la Sala
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-zinc-500 hover:text-white transition-colors">
            Volver al Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
