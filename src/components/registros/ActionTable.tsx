'use client';

import React, { useState } from 'react';
import { Registro } from '@/domain/types';
import { Edit3, Trash2, Loader2 } from 'lucide-react';
import { useCharacterStore } from '@/store/useCharacterStore';
import { RegistrosService } from '@/services/supabase/registros.service';
import { useToastStore } from '@/components/ui/Toast';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';

interface ActionTableProps {
  acciones: Registro[];
  onRefresh?: () => void;
  onEdit?: (reg: Registro) => void;
  isAdmin?: boolean;
  subjectId?: number;
}

export default function ActionTable({ acciones, onRefresh, onEdit, isAdmin }: ActionTableProps) {
  const { activeCharacter } = useCharacterStore();
  const addToast = useToastStore(state => state.addToast);
  const { confirm: confirmAction } = useConfirmStore();
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const renderActionTitle = (title: string, charName: string) => {
    if (!title) return 'Acción General.';
    
    // Normalize string and extract the first word
    const trimmed = title.trim();
    const words = trimmed.split(/\s+/);
    if (words.length === 0) return 'Acción General.';
    
    const firstWordRaw = words[0];
    // Strip trailing punctuation from the first word for matching (e.g. "Kumonin," -> "Kumonin")
    const firstWordClean = firstWordRaw.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, '');
    
    // Set of common Spanish verbs, articles, and stop words that can start an action log but are NOT names
    const EXCLUDED_FIRST_WORDS = new Set([
      'se', 'el', 'la', 'los', 'las', 'un', 'una', 'este', 'esta',
      'compró', 'compra', 'venta', 'vendió', 'entrenó', 'entrenamiento',
      'viajó', 'viaje', 'gasto', 'gastó', 'obtiene', 'obtención',
      'modificó', 'ascendió', 'ascenso', 'combatió', 'combate',
      'fue', 'era', 'tiene', 'tenia', 'tenía', 'hizo', 'realizó'
    ]);
    
    const isCapitalized = /^[A-ZÁÉÍÓÚÑ]/.test(firstWordClean);
    const isExcluded = EXCLUDED_FIRST_WORDS.has(firstWordClean.toLowerCase());
    
    // We treat it as a name if:
    // 1. It matches the current character's name (case-insensitive) OR
    // 2. It is capitalized, longer than 2 characters, not in the exclusion list, and if there is a second word, it starts with lowercase.
    let isName = false;
    
    if (firstWordClean.toLowerCase() === charName.toLowerCase()) {
      isName = true;
    } else if (isCapitalized && firstWordClean.length > 2 && !isExcluded) {
      if (words.length > 1) {
        const secondWord = words[1];
        // If the second word starts with a lowercase letter, the first word is almost certainly a proper noun (name)
        const isSecondWordLowercase = /^[a-z]+/.test(secondWord);
        if (isSecondWordLowercase) {
          isName = true;
        }
      } else {
        // Only one word in the title
        isName = true;
      }
    }
    
    if (isName) {
      const nameLength = firstWordRaw.length;
      const restOfTitle = trimmed.substring(nameLength);
      return (
        <>
          <strong className="font-black text-oro">{firstWordRaw}</strong>
          {restOfTitle}
          {trimmed.endsWith('.') ? '' : '.'}
        </>
      );
    }
    
    return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
  };

  const getParticipants = (m: Registro) => {
    if (m.data.participantes_historicos && Array.isArray(m.data.participantes_historicos)) {
      return m.data.participantes_historicos;
    }
    if (m.participantes && m.participantes.length > 0) {
      return m.participantes.map(p => ({
        id: p.personaje_id,
        nombre_ninja: p.personaje?.nombre_ninja || 'Ninja Desaparecido'
      }));
    }
    return [{ id: m.autor_id, nombre_ninja: m.autor?.nombre_ninja || 'Autor Desconocido' }];
  };

  const handleDelete = async (id: number) => {
    const ok = await confirmAction({
      title: 'Eliminar Registro de Acción',
      message: '¿Estás seguro de que quieres eliminar esta acción permanentemente?',
      variant: 'danger',
      requireValidation: true
    });
    if (!ok) return;
    
    setLoadingId(id);
    try {
      await RegistrosService.deleteRegistro(id);
      addToast('Acción eliminada correctamente', 'success');
      onRefresh?.();
    } catch (err: any) {
      addToast(err.message || 'Error al eliminar la acción', 'error');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="ninja-card-oro p-1 overflow-hidden border border-oro/10">
      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-oro/10 text-oro/40 text-[10px] xl:text-xs font-black uppercase tracking-[0.3em]">
              <th className="py-6 px-8 w-32">Fecha</th>
              <th className="py-6 px-8">Acción / Crónica</th>
              <th className="py-6 px-8 w-36">Coste</th>
              <th className="py-6 px-8 text-right w-36">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-oro/5 bg-black/20">
            {acciones.map((m) => {
              const isOwner = activeCharacter?.id === m.autor_id;
              const canManage = isAdmin;
              
              const xpSpent = m.data.gasto_xp || 0;
              const ryousSpent = m.data.gasto_ryous || 0;

              const selfName = m.autor?.nombre_ninja || activeCharacter?.nombre_ninja || 'El ninja';

              return (
                <tr key={m.id} className="hover:bg-oro/5 transition-colors group">
                  {/* Fecha */}
                  <td className="py-6 px-8">
                    <div className="flex flex-col justify-center gap-2">
                      {/* Fecha de Creación */}
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-oro/80 uppercase tracking-wider">
                          {new Date(m.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-[9px] font-bold text-oro/30 uppercase tracking-widest mt-0.5">
                          {new Date(m.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      {/* Fecha de Modificación */}
                      {m.data.fecha_modificacion && (
                        <div className="flex flex-col border-t border-rojo-sangre/10 pt-1.5">
                          <span className="text-[7px] font-black text-rojo-sangre/40 uppercase tracking-widest">
                            MODIFICADO
                          </span>
                          <span className="text-[10px] font-black text-rojo-sangre/80 uppercase tracking-wider mt-0.5">
                            {new Date(m.data.fecha_modificacion).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-[8px] font-bold text-rojo-sangre/40 uppercase tracking-widest mt-0.5">
                            {new Date(m.data.fecha_modificacion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Acción / Crónica */}
                  <td className="py-6 px-8 text-oro/80 text-xs xl:text-sm whitespace-normal break-words">
                    {renderActionTitle(m.data.titulo, selfName)}
                  </td>

                  {/* Coste */}
                  <td className="py-6 px-8">
                    <div className="flex flex-col gap-1.5 justify-center">
                      {xpSpent > 0 && (
                        <div className="text-xs font-black text-red-500 tracking-wider">
                          -{xpSpent} XP
                        </div>
                      )}
                      {ryousSpent > 0 && (
                        <div className="text-xs font-black text-oro/60 tracking-wider">
                          -{ryousSpent} Ryos
                        </div>
                      )}
                      {xpSpent === 0 && ryousSpent === 0 && (
                        <span className="text-[10px] text-oro/20 uppercase tracking-widest italic">Gratis</span>
                      )}
                    </div>
                  </td>

                  {/* Acciones */}
                  <td className="py-6 px-8 text-right">
                    {canManage ? (
                      <div className="flex items-center justify-end gap-2.5">
                        <button 
                          onClick={() => onEdit?.(m)}
                          className="p-2 bg-oro/10 border border-oro/30 hover:border-oro hover:bg-oro/20 text-oro/80 hover:text-oro transition-all ninja-clip-xs"
                          title="Editar Registro"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(m.id)}
                          disabled={loadingId === m.id}
                          className="p-2 bg-red-600/10 border border-red-600/40 hover:border-red-500 hover:bg-red-600/20 text-red-500 hover:text-red-400 transition-all ninja-clip-xs"
                          title="Eliminar Registro"
                        >
                          {loadingId === m.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-oro" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-oro/20 uppercase tracking-widest italic">Sólo lectura</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
