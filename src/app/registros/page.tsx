'use client';

import Link from 'next/link';
import { ScrollText, Swords, Zap, ArrowLeft, ChevronRight, ShoppingBag } from 'lucide-react';

export default function RegistrosLandingPage() {
  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-12 flex flex-col">
      <header className="w-full max-w-[1750px] mx-auto flex flex-col md:flex-row justify-between items-center gap-10 mb-10 ninja-card-oro p-8 xl:p-10 z-50">
        <Link href="/" className="flex items-center gap-4 text-oro hover:brightness-125 transition-all group font-black uppercase tracking-widest text-sm xl:text-lg">
          <div className="w-2 xl:w-3 h-2 xl:h-3 bg-rojo-sangre rotate-45 group-hover:bg-oro transition-colors" />
          Volver al Dashboard
        </Link>
        <div className="flex items-center gap-4">
          <img src="/assets/icons/shuriken.png" className="w-4 xl:w-6 h-auto" alt="icon" />
          <h1 className="text-xl xl:text-2xl font-black text-oro uppercase tracking-[0.3em]">
            Registros <span className="text-oro/40">Mundiales</span>
          </h1>
        </div>
      </header>

      <main className="w-full max-w-[1750px] mx-auto flex-1">
        <div className="mb-20 ninja-card-oro p-12 xl:p-16">
          <div className="flex items-center gap-6 mb-6">
            {/* <img src="/assets/icons/shuriken.png" className="w-5 xl:w-8 h-auto" alt="icon" /> */}
            <h1 className="ninja-title text-5xl xl:text-8xl">REGISTROS NINJA</h1>
          </div>
          <p className="text-gris-texto text-lg xl:text-2xl max-w-4xl leading-relaxed">Consulta el historial de misiones, registros de combate y transacciones económicas de todo el mundo ninja.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 xl:gap-16">
          {/* Tarjeta Misiones */}
          <Link href="/registros/misiones" className="group relative overflow-hidden ninja-card-oro p-10 xl:p-16 hover-ninja flex flex-col justify-between min-h-[400px]">
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                {/* <div className="w-3 h-3 bg-rojo-sangre rotate-45" /> */}
                <h3 className="text-3xl xl:text-5xl font-black text-oro uppercase tracking-widest">Misiones</h3>
              </div>
              <p className="text-gris-texto/80 text-lg xl:text-2xl leading-relaxed max-w-sm mb-12">
                Historial de encargos completados, rangos ninja y recompensas obtenidas por la aldea.
              </p>
            </div>
            
            <div className="flex items-center gap-4 text-oro font-black uppercase tracking-[0.2em] text-xs xl:text-base group-hover:brightness-125 transition-all relative z-10">
              <span>Explorar Registros</span>
              <div className="w-1.5 h-1.5 bg-oro rotate-45 group-hover:translate-x-2 transition-transform" />
            </div>
          </Link>

          {/* Tarjeta Combates */}
          <Link href="/registros/combates" className="group relative overflow-hidden ninja-card-oro p-10 xl:p-16 hover-ninja flex flex-col justify-between min-h-[400px]">
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                {/* <div className="w-3 h-3 bg-rojo-sangre rotate-45" /> */}
                <h3 className="text-3xl xl:text-5xl font-black text-oro uppercase tracking-widest">Combates</h3>
              </div>
              <p className="text-gris-texto/80 text-lg xl:text-2xl leading-relaxed max-w-sm mb-12">
                Crónicas de enfrentamientos, duelos por el honor y batallas a gran escala.
              </p>
            </div>
            
            <div className="flex items-center gap-4 text-oro font-black uppercase tracking-[0.2em] text-xs xl:text-base group-hover:brightness-125 transition-all relative z-10">
              <span>Ver Resultados</span>
              <div className="w-1.5 h-1.5 bg-oro rotate-45 group-hover:translate-x-2 transition-transform" />
            </div>
          </Link>

          {/* Tarjeta Compras */}
          <Link href="/registros/compras" className="group relative overflow-hidden ninja-card-oro p-10 xl:p-16 hover-ninja flex flex-col justify-between min-h-[400px]">
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                {/* <div className="w-3 h-3 bg-rojo-sangre rotate-45" /> */}
                <h3 className="text-3xl xl:text-5xl font-black text-oro uppercase tracking-widest">Compras</h3>
              </div>
              <p className="text-gris-texto/80 text-lg xl:text-2xl leading-relaxed max-w-sm mb-12">
                Registro de transacciones, adquisición de armamento y equipo shinobi.
              </p>
            </div>
            
            <div className="flex items-center gap-4 text-oro font-black uppercase tracking-[0.2em] text-xs xl:text-base group-hover:brightness-125 transition-all relative z-10">
              <span>Revisar Gastos</span>
              <div className="w-1.5 h-1.5 bg-oro rotate-45 group-hover:translate-x-2 transition-transform" />
            </div>
          </Link>

        </div>
      </main>
    </div>
  );
}
