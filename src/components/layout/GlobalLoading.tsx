'use client';

import { useState, useEffect } from 'react';

export default function GlobalLoading() {
  const [loading, setLoading] = useState(true);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    // Esperar a que la ventana esté totalmente cargada (imágenes, fuentes, etc.)
    const handleLoad = () => {
      setLoading(false);
      // Darle tiempo a la animación de desvanecimiento antes de desmontar
      setTimeout(() => setShouldRender(false), 1000);
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, []);

  if (!shouldRender) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center transition-opacity duration-1000 pointer-events-none ${
        loading ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="relative">
        {/* Logo o spinner ninja */}
        <div className="w-20 h-20 border-4 border-oro/20 border-t-oro rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
            <img src="/assets/icons/shuriken.png" className="w-6 h-6 object-contain" alt="Logo" />
        </div>
      </div>
      <p className="mt-8 text-oro font-black uppercase tracking-[0.5em] text-[10px] animate-pulse">
        Cargando Mundo Ninja
      </p>
    </div>
  );
}
