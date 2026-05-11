import Link from 'next/link';
import { Map, GitBranch, ChevronRight, ScrollText, ChevronLeft } from 'lucide-react';

export default function DocumentosPage() {
  return (
    <div className="min-h-screen bg-black pt-24 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-12 text-xs font-black uppercase tracking-widest group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver al inicio
        </Link>

        <header className="mb-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
            <ScrollText className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Biblioteca Ninja</span>
          </div>
          <h1 className="text-6xl md:text-7xl font-black text-white tracking-tighter mb-6 uppercase">DOCUMENTOS</h1>
          <p className="text-zinc-500 max-w-xl mx-auto text-lg leading-relaxed text-balance">
            Accede a toda la información detallada sobre la geografía de las aldeas y el funcionamiento de las ramas de combate.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tarjeta Aldeas */}
          <Link href="/aldeas" className="group relative p-10 bg-zinc-900 border border-zinc-800 rounded-[3rem] hover:border-emerald-500/50 transition-all overflow-hidden flex flex-col justify-between aspect-square md:aspect-auto md:h-[400px]">
            <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-20 group-hover:scale-110 transition-all">
              <Map className="w-64 h-64 text-emerald-500" />
            </div>
            
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 flex items-center justify-center mb-8 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:scale-110 transition-all">
                <Map className="w-8 h-8 text-emerald-500 group-hover:text-white" />
              </div>
              <h2 className="text-4xl font-black text-white mb-4 uppercase tracking-tighter">ALDEAS</h2>
              <p className="text-zinc-500 text-lg">Lore, clanes, jerarquías y geografía de las 5 grandes naciones.</p>
            </div>

            <div className="relative z-10 flex items-center gap-3 text-emerald-500 font-black uppercase tracking-widest text-xs group-hover:translate-x-2 transition-transform">
              Explorar mundo <ChevronRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Tarjeta Ramas */}
          <Link href="/ramas" className="group relative p-10 bg-zinc-900 border border-zinc-800 rounded-[3rem] hover:border-amber-500/50 transition-all overflow-hidden flex flex-col justify-between aspect-square md:aspect-auto md:h-[400px]">
            <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-20 group-hover:scale-110 transition-all">
              <GitBranch className="w-64 h-64 text-amber-500" />
            </div>

            <div className="relative z-10">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 flex items-center justify-center mb-8 border border-amber-500/20 group-hover:bg-amber-500 group-hover:scale-110 transition-all">
                <GitBranch className="w-8 h-8 text-amber-500 group-hover:text-white" />
              </div>
              <h2 className="text-4xl font-black text-white mb-4 uppercase tracking-tighter">RAMAS</h2>
              <p className="text-zinc-500 text-lg">Especialidades, funcionamiento de ramas, clanes y técnicas.</p>
            </div>

            <div className="relative z-10 flex items-center gap-3 text-amber-500 font-black uppercase tracking-widest text-xs group-hover:translate-x-2 transition-transform">
              Ver especialidades <ChevronRight className="w-4 h-4" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
