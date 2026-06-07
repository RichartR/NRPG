'use client';

import { useState } from 'react';
import { Registro } from '@/domain/types';
import { Link as LinkIcon, Edit3, Trash2, Loader2, Sparkles, Coins } from 'lucide-react';
import { useCharacterStore } from '@/store/useCharacterStore';
import { RegistrosService } from '@/services/supabase/registros.service';
import { useToastStore } from '@/components/ui/Toast';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';

interface NarrationTableProps {
  narraciones: Registro[];
  onRefresh?: () => void;
  onEdit?: (reg: Registro) => void;
  isAdmin?: boolean;
}

export default function NarrationTable({ narraciones, onRefresh, onEdit, isAdmin }: NarrationTableProps) {
  const { activeCharacter } = useCharacterStore();
  const addToast = useToastStore(state => state.addToast);
  const { confirm: confirmAction } = useConfirmStore();
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const getParticipants = (n: Registro) => {
    if (n.data.participantes_historicos && Array.isArray(n.data.participantes_historicos)) {
      return n.data.participantes_historicos;
    }
    if (n.participantes && n.participantes.length > 0) {
      return n.participantes.map(p => ({
        id: p.personaje_id,
        nombre_ninja: p.personaje?.nombre_ninja || 'Ninja Desaparecido'
      }));
    }
    return [{ id: n.autor_id, nombre_ninja: n.autor?.nombre_ninja || 'Autor Desconocido' }];
  };

  const handleDelete = async (id: number) => {
    const ok = await confirmAction({
      title: 'Eliminar Registro de Narración',
      message: '¿Estás seguro de que quieres eliminar esta narración permanentemente?',
      variant: 'danger',
      requireValidation: true
    });
    if (!ok) return;

    setLoadingId(id);
    try {
      await RegistrosService.deleteRegistro(id);
      addToast('Registro de narración eliminado correctamente', 'success');
      onRefresh?.();
    } catch (err: any) {
      addToast(err.message || 'Error al eliminar la narración', 'error');
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
              <th className="py-3 px-5 w-[16%]">Fecha</th>
              <th className="py-3 px-5 w-[15%]">Narrador</th>
              <th className="py-3 px-5 w-[22%]">Participantes</th>
              <th className="py-3 px-5 w-[20%]">Recompensas (Globales)</th>
              <th className="py-3 px-5 w-[17%]">Pruebas</th>
              <th className="py-3 px-5 text-right w-[10%]">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-oro/5 bg-black/40">
            {narraciones.map((n) => {
              const participants = getParticipants(n);
              const isOwner = activeCharacter?.id === n.autor_id;
              const canManage = isOwner || isAdmin;

              return (
                <tr key={n.id} className="hover:bg-oro/5 transition-colors group">
                  {/* Fecha */}
                  <td className="py-3 px-5">
                    <div className="flex flex-col justify-center gap-2">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-oro/80 uppercase tracking-wider">
                          {new Date(n.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-caption font-bold text-oro/30 uppercase tracking-widest mt-0.5">
                          {new Date(n.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {n.data.fecha_modificacion && (
                        <div className="flex flex-col border-t border-error-text/30 pt-1.5">
                          <span className="text-[7px] font-black text-red-500/60 uppercase tracking-widest">
                            MODIFICADO
                          </span>
                          <span className="text-caption font-black text-red-400 uppercase tracking-wider mt-0.5">
                            {new Date(n.data.fecha_modificacion).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-caption font-bold text-red-500/60 uppercase tracking-widest mt-0.5">
                            {new Date(n.data.fecha_modificacion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Narrador */}
                  <td className="py-3 px-5 font-black text-oro tracking-widest text-xs uppercase leading-relaxed">
                    {n.data.narrador || 'Sin narrador'}
                  </td>

                  {/* Participantes */}
                  <td className="py-3 px-5">
                    <div className="flex flex-wrap gap-2 max-w-[300px]">
                      {participants.map((p, idx) => (
                        <span
                          key={idx}
                          className="text-caption font-black text-oro/70 uppercase tracking-widest px-2.5 py-1 bg-oro/5 border border-oro/10 ninja-clip-xs"
                        >
                          {p.nombre_ninja}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Recompensas Globales */}
                  <td className="py-3 px-5">
                    <div className="flex flex-col gap-1.5 justify-center">
                      <div className="flex items-center gap-1.5 text-xs font-black text-green-700 tracking-wider">
                        <span>+{n.data.global_xp || 0} EXP</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-black text-green-700 tracking-wider">
                        <span>+{n.data.global_ryous || 0} Ryos</span>
                      </div>
                      {Number(n.data.global_monedas_evento) > 0 && (
                        <div className="flex items-center gap-1.5 text-caption font-black text-green-700 tracking-wider">
                          <span>+{n.data.global_monedas_evento} ME</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Pruebas */}
                  <td className="py-3 px-5">
                    <div className="flex flex-wrap gap-2 max-w-[200px]">
                      {n.data.urls_imagenes && n.data.urls_imagenes.length > 0 ? (
                        n.data.urls_imagenes.map((url: string, idx: number) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-oro/5 border border-oro/10 hover:border-oro/40 hover:bg-oro/10 text-caption font-black text-oro/70 hover:text-oro uppercase tracking-widest transition-all ninja-clip-xs"
                            title={url}
                          >
                            <LinkIcon className="w-3 h-3" />
                            <span>PRUEBA {idx + 1}</span>
                          </a>
                        ))
                      ) : (
                        <span className="text-caption text-oro/20 uppercase tracking-widest italic">Sin pruebas</span>
                      )}
                    </div>
                  </td>

                  {/* Acciones */}
                  <td className="py-3 px-5 text-right">
                    {canManage ? (
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          onClick={() => onEdit?.(n)}
                          className="p-2 bg-oro/10 border border-oro/30 hover:border-oro hover:bg-oro/20 text-oro/80 hover:text-oro transition-all ninja-clip-xs"
                          title="Editar Registro"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(n.id)}
                          disabled={loadingId === n.id}
                          className="p-2 bg-red-600/10 border border-red-600/40 hover:border-error-text hover:bg-red-600/20 text-red-500 hover:text-red-400 transition-all ninja-clip-xs"
                          title="Eliminar Registro"
                        >
                          {loadingId === n.id ? (
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
