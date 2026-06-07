'use client';

import { useState } from 'react';
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

export default function ActionTable({ acciones, onRefresh, onEdit, isAdmin, subjectId }: ActionTableProps) {
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
        <table className="w-full text-left border-collapse min-w-[700px] table-fixed">
          <thead>
            <tr className="border-b border-oro/10 text-oro/70 text-caption xl:text-xs font-black uppercase tracking-[0.3em]">
              <th className="py-3 px-5 w-[18%]">Fecha</th>
              <th className="py-3 px-5 w-[52%]">Acción / Crónica</th>
              <th className="py-3 px-5 w-[15%] w-36">Coste / Recompensa</th>
              <th className="py-3 px-5 text-right w-[15%] w-36">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-oro/5 bg-black/40">
            {acciones.map((m) => {
              const isOwner = activeCharacter?.id === m.autor_id;
              const canManage = isAdmin;

              const xpSpent = m.tipo === 'compra' ? (m.data.coste_exp || 0) : (m.data.gasto_xp || 0);
              const ryousSpent = m.tipo === 'compra' ? (m.data.coste_ryous || 0) : (m.data.gasto_ryous || 0);
              const eventCoinsSpent = m.tipo === 'compra' ? (m.data.coste_moneda_evento || 0) : 0;

              const selfName = m.autor?.nombre_ninja || activeCharacter?.nombre_ninja || 'El ninja';
              const actionTitle = m.tipo === 'compra'
                ? `${selfName} adquirió ${m.data.objeto_nombre || m.data.objeto || 'Equipo Ninja'}${m.data.detalles ? ` (${m.data.detalles})` : ''}`
                : m.subtipo === 'narracion'
                  ? `Evento de Narración por ${m.data.narrador || 'Narrador'}`
                  : m.data.titulo;

              // Obtener premios del shinobi si es reparto de evento
              const targetCharId = subjectId || activeCharacter?.id;
              const partPremio = (m.subtipo === 'evento_premios' || m.subtipo === 'narracion')
                ? m.data.participantes_premios?.find((p: any) => Number(p.personaje_id) === Number(targetCharId))
                : null;

              const globalXp = Number(m.data.global_xp) || 0;
              const globalRyous = Number(m.data.global_ryous) || 0;
              const globalMonedas = Number(m.data.global_monedas_evento) || 0;

              const xpObtained = globalXp + (Number(partPremio?.xp_extra) || Number(partPremio?.xp) || 0);
              const ryousObtained = globalRyous + (Number(partPremio?.ryous_extra) || Number(partPremio?.ryous) || 0);
              const monedasObtained = globalMonedas + (Number(partPremio?.monedas_evento) || 0);
              const glosarioObtained = partPremio?.glosario_items || [];

              return (
                <tr key={m.id} className="hover:bg-oro/5 transition-colors group">
                  {/* Fecha */}
                  <td className="py-3 px-5">
                    <div className="flex flex-col justify-center gap-2">
                      {/* Fecha de Creación */}
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-oro/80 uppercase tracking-wider">
                          {new Date(m.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-caption font-bold text-oro/30 uppercase tracking-widest mt-0.5">
                          {new Date(m.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Fecha de Modificación */}
                      {m.data.fecha_modificacion && (
                        <div className="flex flex-col border-t border-error-text/30 pt-1.5">
                          <span className="text-[7px] font-black text-red-500/60 uppercase tracking-widest">
                            MODIFICADO
                          </span>
                          <span className="text-caption font-black text-red-400 uppercase tracking-wider mt-0.5">
                            {new Date(m.data.fecha_modificacion).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-caption font-bold text-red-500/60 uppercase tracking-widest mt-0.5">
                            {new Date(m.data.fecha_modificacion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Acción / Crónica */}
                  <td className="py-3 px-5 text-oro/80 text-xs xl:text-sm whitespace-normal break-words">
                    {renderActionTitle(actionTitle, selfName)}
                  </td>

                  {/* Coste */}
                  <td className="py-3 px-5">
                    <div className="flex flex-col gap-1.5 justify-center">
                      {(m.subtipo === 'evento_premios' || m.subtipo === 'narracion') ? (
                        <div className="flex flex-col gap-1 justify-center text-emerald-400 font-bold text-[11px] tracking-wide">
                          {xpObtained > 0 && <div className="text-emerald-400">+{xpObtained} EXP</div>}
                          {ryousObtained > 0 && <div className="text-emerald-400">+{ryousObtained} Ryos</div>}
                          {monedasObtained > 0 && <div className="text-emerald-400">+{monedasObtained} M. Evento</div>}
                          {glosarioObtained.length > 0 && (
                            <div className="text-caption text-oro/50 mt-0.5 font-bold uppercase tracking-wide">
                              + {glosarioObtained.map((g: any) => g.nombre_es).join(', ')}
                            </div>
                          )}
                          {xpObtained === 0 && ryousObtained === 0 && monedasObtained === 0 && glosarioObtained.length === 0 && (
                            <span className="text-caption text-oro/20 uppercase tracking-widest italic">-</span>
                          )}
                        </div>
                      ) : (
                        <>
                          {xpSpent > 0 && (
                            <div className="text-xs font-black text-red-700 tracking-wider">
                              -{xpSpent.toLocaleString()} EXP
                            </div>
                          )}
                          {ryousSpent > 0 && (
                            <div className="text-xs font-black text-red-700 tracking-wider">
                              -{ryousSpent.toLocaleString()} Ryos
                            </div>
                          )}
                          {eventCoinsSpent > 0 && (
                            <div className="text-xs font-black text-red-700 tracking-wider">
                              -{eventCoinsSpent.toLocaleString()} Monedas de Evento
                            </div>
                          )}
                          {xpSpent === 0 && ryousSpent === 0 && eventCoinsSpent === 0 && (
                            <span className="text-caption text-oro/20 uppercase tracking-widest italic">Gratis</span>
                          )}
                        </>
                      )}
                    </div>
                  </td>

                  {/* Acciones */}
                  <td className="py-3 px-5 text-right">
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
                          className="p-2 bg-red-600/10 border border-red-600/40 hover:border-error-text hover:bg-red-600/20 text-red-500 hover:text-red-400 transition-all ninja-clip-xs"
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
                      <span className="text-caption text-oro/20 uppercase tracking-widest italic"></span>
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
