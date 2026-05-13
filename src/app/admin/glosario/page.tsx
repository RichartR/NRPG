import GlosarioManager from '@/components/admin/GlosarioManager';
import { Settings } from 'lucide-react';

export default function AdminGlosarioPage() {
  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* HEADER */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 text-emerald-500 mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Settings size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Administración</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">
            Registro <span className="text-zinc-800">Maestro</span>
          </h1>
          <p className="text-zinc-500 text-lg font-medium max-w-2xl">
            Control total de los elementos del juego. Gestiona técnicas, objetos, pasivas y requisitos desde un solo lugar.
          </p>
        </div>

        {/* MANAGER */}
        <div className="bg-zinc-950/50 border border-zinc-900 rounded-[3rem] p-8 md:p-12 shadow-2xl">
          <GlosarioManager />
        </div>
      </div>
    </main>
  );
}
