'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Map, Gamepad2, ChevronRight, ChevronLeft } from 'lucide-react';

export default function QuickAccessHUD() {
  const [isOpen, setIsOpen] = useState(true);

  // SVG de Discord Oficial
  const DiscordIcon = () => (
    <svg
      viewBox="0 0 127.14 96.36"
      className="w-5 h-5 fill-current"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.4-5c.87-.64,1.71-1.32,2.53-2a75.47,75.47,0,0,0,72.69,0c.82.7,1.66,1.38,2.53,2a68.43,68.43,0,0,1-10.4,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31.06-18.83C129,50.7,122.64,27.93,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
    </svg>
  );

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex items-center">
      {/* Botón de Minimizar / Contraer HUD */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-full bg-neutral-950/90 border border-oro/30 hover:border-oro text-oro flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 shrink-0 z-10"
        style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
        title={isOpen ? "Ocultar Accesos Rápidos" : "Mostrar Accesos Rápidos"}
      >
        {isOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Contenedor HUD */}
      <div
        className={`flex items-center relative transition-all duration-500 ease-out origin-left ${isOpen ? 'max-w-xs ml-3 px-4 py-2.5 opacity-100 pointer-events-auto' : 'max-w-0 ml-0 px-0 py-0 opacity-0 pointer-events-none'
          }`}
      >
        {/* Fondo decorativo con clip-path para evitar recortar los tooltips */}
        <div 
          className="absolute inset-0 bg-neutral-950/85 backdrop-blur-md border border-oro/30 shadow-[0_0_25px_rgba(255,230,159,0.15)] -z-10"
          style={{ 
            clipPath: isOpen ? 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)' : 'none'
          }}
        />

        <div className="flex items-center gap-3.5 shrink-0 relative z-10">
          {/* Link Discord */}
          <div className="group relative flex justify-center">
            <a
              href="https://discord.gg/WmKZ5B8ZDG"
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 bg-oro/20 group-hover:bg-oro transition-all duration-300 flex items-center justify-center relative"
              style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
            >
              <div 
                className="absolute inset-[1px] bg-neutral-950 group-hover:bg-neutral-900 transition-all duration-300 flex items-center justify-center text-oro/70 group-hover:text-oro"
                style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
              >
                <DiscordIcon />
              </div>
            </a>
            {/* Tooltip */}
            <span className="absolute bottom-14 scale-0 group-hover:scale-100 transition-all duration-200 bg-neutral-950 border border-oro/40 text-oro text-[10px] font-black uppercase tracking-widest px-3 py-1.5 whitespace-nowrap pointer-events-none shadow-xl z-20"
              style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
            >
              Discord Oficial
            </span>
          </div>

          {/* Link Mapa */}
          <div className="group relative flex justify-center">
            <Link
              href="/mapa"
              className="w-11 h-11 bg-oro/20 group-hover:bg-oro transition-all duration-300 flex items-center justify-center relative"
              style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
            >
              <div 
                className="absolute inset-[1px] bg-neutral-950 group-hover:bg-neutral-900 transition-all duration-300 flex items-center justify-center text-oro/70 group-hover:text-oro"
                style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
              >
                <Map className="w-5 h-5" />
              </div>
            </Link>
            {/* Tooltip */}
            <span className="absolute bottom-14 scale-0 group-hover:scale-100 transition-all duration-200 bg-neutral-950 border border-oro/40 text-oro text-[10px] font-black uppercase tracking-widest px-3 py-1.5 whitespace-nowrap pointer-events-none shadow-xl z-20"
              style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
            >
              Mapa Interactivo
            </span>
          </div>

          {/* Link Hobba */}
          <div className="group relative flex justify-center">
            <a
              href="https://hobba.tv"
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 bg-oro/20 group-hover:bg-oro transition-all duration-300 flex items-center justify-center relative"
              style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
            >
              <div 
                className="absolute inset-[1px] bg-neutral-950 group-hover:bg-neutral-900 transition-all duration-300 flex items-center justify-center text-oro/70 group-hover:text-oro"
                style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
              >
                <Gamepad2 className="w-5 h-5" />
              </div>
            </a>
            {/* Tooltip */}
            <span className="absolute bottom-14 scale-0 group-hover:scale-100 transition-all duration-200 bg-neutral-950 border border-oro/40 text-oro text-[10px] font-black uppercase tracking-widest px-3 py-1.5 whitespace-nowrap pointer-events-none shadow-xl z-20"
              style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
            >
              Jugar en Hobba.tv
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
