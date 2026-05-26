'use client';

import { useMasterStore } from '@/store/useMasterStore';
import ElementoList from './ElementoList';

export default function ElementoManager() {
  const elementos = useMasterStore((s) => s.elementos);
  const ramaElementos = useMasterStore((s) => s.ramaElementos);
  const ramas = useMasterStore((s) => s.ramas);
  const subEspecialidades = useMasterStore((s) => s.subEspecialidades);

  return (
    <ElementoList
      initialElementos={elementos}
      ramas={ramas}
      subEspecialidades={subEspecialidades}
      ramaElementos={ramaElementos}
    />
  );
}
