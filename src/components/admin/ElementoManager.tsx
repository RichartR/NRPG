'use client';

import { useState, useEffect } from 'react';
import { useMasterStore } from '@/store/useMasterStore';
import ElementoList from './ElementoList';
import ElementoEditForm from './ElementoEditForm';
import { Elemento, RamaElemento } from '@/domain/types';
import { MasterService } from '@/services/supabase/master.service';

export default function ElementoManager() {
  const elementos = useMasterStore((s) => s.elementos);
  const ramaElementos = useMasterStore((s) => s.ramaElementos);
  const ramas = useMasterStore((s) => s.ramas);
  const subEspecialidades = useMasterStore((s) => s.subEspecialidades);
  const refreshMaster = useMasterStore((s) => s.refresh);

  const [selectedElemento, setSelectedElemento] = useState<Elemento | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [localVinculaciones, setLocalVinculaciones] = useState<RamaElemento[]>([]);

  // Cargar vinculaciones específicas del elemento seleccionado
  useEffect(() => {
    if (selectedElemento?.id) {
      setLocalVinculaciones(ramaElementos.filter((v) => v.elemento_id === selectedElemento.id));
    } else {
      setLocalVinculaciones([]);
    }
  }, [selectedElemento, ramaElementos]);

  const handleEdit = (elemento: Elemento) => {
    setSelectedElemento(elemento);
    setIsEditing(true);
  };

  const handleCreate = () => {
    setSelectedElemento(undefined);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedElemento(undefined);
    refreshMaster(); // Recargar datos frescos del master store
  };

  return (
    <div className="space-y-6">
      {isEditing ? (
        <ElementoEditForm
          elemento={selectedElemento}
          ramas={ramas}
          subEspecialidades={subEspecialidades}
          vinculaciones={localVinculaciones}
          onCancel={handleCancel}
        />
      ) : (
        <ElementoList
          elementos={elementos}
          ramas={ramas}
          subEspecialidades={subEspecialidades}
          vinculaciones={ramaElementos}
          onEdit={handleEdit}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
