'use client';

import { useEffect } from 'react';
import { useMasterStore } from '@/store/useMasterStore';
import SentidoList from './SentidoList';

export default function SentidoManager() {
  const sentidos = useMasterStore((s) => s.sentidos);
  const ramaSentidos = useMasterStore((s) => s.ramaSentidos);
  const ramas = useMasterStore((s) => s.ramas);
  const subEspecialidades = useMasterStore((s) => s.subEspecialidades);
  const initialized = useMasterStore((s) => s.initialized);
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
    <SentidoList
      initialSentidos={sentidos}
      ramas={ramas}
      subEspecialidades={subEspecialidades}
      ramaSentidos={ramaSentidos}
    />
  );
}
