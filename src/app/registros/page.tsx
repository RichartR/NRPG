'use client';

import Link from 'next/link';
import { ScrollText, Swords, Zap, ArrowLeft, ChevronRight } from 'lucide-react';

export default function RegistrosLandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-10">
      <div className="max-w-7xl mx-auto">
        <header className="mb-16 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-6xl font-black italic uppercase tracking-tighter flex items-center gap-4 mb-4">
              <Zap className="w-14 h-14 text-orange-500 fill-orange-500/20" />
              Registros <span className="text-zinc-800">Mundiales</span>
            </h1>
            <p className="text-zinc-500 font-bold uppercase tracking-[0.4em] text-xs">Selecciona la bitácora que deseas consultar</p>
          </div>
          <Link 
            href="/" 
            className="flex items-center gap-3 px-8 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-xs font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-white hover:border-zinc-700 transition-all group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Volver al Dashboard
          </Link>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Tarjeta Misiones */}
          <Link href="/registros/misiones" className="group relative overflow-hidden bg-zinc-900/40 border border-zinc-800 hover:border-orange-500/50 p-12 rounded-[3rem] transition-all hover:shadow-[0_0_50px_-10px_rgba(249,115,22,0.2)] backdrop-blur-xl">
            <div className="absolute top-0 right-0 p-12 opacity-5 transform translate-x-4 -translate-y-4 group-hover:scale-110 group-hover:opacity-10 transition-all duration-500">
              <ScrollText className="w-64 h-64 text-orange-500" />
            </div>
            
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="w-16 h-16 bg-orange-500/10 border border-orange-500/20 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500">
                  <ScrollText className="w-8 h-8 text-orange-500" />
                </div>
                <h3 className="text-4xl font-black text-white mb-4 italic uppercase tracking-tighter">Misiones</h3>
                <p className="text-zinc-500 text-lg leading-relaxed max-w-sm">
                  Historial de encargos completados, rangos ninja y recompensas obtenidas por la aldea.
                </p>
              </div>
              
              <div className="mt-12 flex items-center gap-3 text-orange-500 font-black uppercase tracking-[0.2em] text-xs">
                Explorar Registros
                <ChevronRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Tarjeta Combates */}
          <Link href="/registros/combates" className="group relative overflow-hidden bg-zinc-900/40 border border-zinc-800 hover:border-red-500/50 p-12 rounded-[3rem] transition-all hover:shadow-[0_0_50px_-10px_rgba(239,68,68,0.2)] backdrop-blur-xl">
            <div className="absolute top-0 right-0 p-12 opacity-5 transform translate-x-4 -translate-y-4 group-hover:scale-110 group-hover:opacity-10 transition-all duration-500">
              <Swords className="w-64 h-64 text-red-500" />
            </div>
            
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500">
                  <Swords className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-4xl font-black text-white mb-4 italic uppercase tracking-tighter">Combates</h3>
                <p className="text-zinc-500 text-lg leading-relaxed max-w-sm">
                  Crónicas de enfrentamientos, duelos por el honor y batallas a gran escala.
                </p>
              </div>
              
              <div className="mt-12 flex items-center gap-3 text-red-500 font-black uppercase tracking-[0.2em] text-xs">
                Ver Resultados
                <ChevronRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
