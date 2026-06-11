'use client';

import { useEffect } from 'react';
import { useMasterStore } from '@/store/useMasterStore';
import ElementoList from './ElementoList';

export default function ElementoManager() {
  const elementos = useMasterStore((s) => s.elementos);
  const ramaElementos = useMasterStore((s) => s.ramaElementos);
  const ramas = useMasterStore((s) => s.ramas);
  const subEspecialidades = useMasterStore((s) => s.subEspecialidades);
  const initialized = useMasterStore((s) => s.initialized);
  const loading = useMasterStore((s) => s.loading);
  const initialize = useMasterStore((s) => s.initialize);

  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  if (!initialized) {
    return (
      <div className="flex flex-col items-center justify-center p-24 bg-black/40 border border-oro/10">
        <div className="w-12 h-12 border-4 border-oro/10 border-t-oro rounded-full animate-spin mb-4" />
        <span className="text-oro/40 text-[10px] font-black uppercase tracking-[0.3em]">Cargando catálogo maestro...</span>
      </div>
    );
  }

  return (
    <ElementoList
      initialElementos={elementos}
      ramas={ramas}
      subEspecialidades={subEspecialidades}
      ramaElementos={ramaElementos}
    />
  );
}
