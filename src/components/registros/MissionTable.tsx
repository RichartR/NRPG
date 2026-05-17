'use client';

import React, { useState } from 'react';
import { Registro } from '@/domain/types';
import { Sparkles, Coins, Link as LinkIcon, Edit3, Trash2, Loader2 } from 'lucide-react';
import { useCharacterStore } from '@/store/useCharacterStore';
import { RegistrosService } from '@/services/supabase/registros.service';
import { useToastStore } from '@/components/ui/Toast';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';

interface MissionTableProps {
  misiones: Registro[];
  onRefresh?: () => void;
  onEdit?: (reg: Registro) => void;
  isAdmin?: boolean;
  subjectId?: number;
}

export default function MissionTable({ misiones, onRefresh, onEdit, isAdmin }: MissionTableProps) {
  const { activeCharacter } = useCharacterStore();
  const addToast = useToastStore(state => state.addToast);
  const { confirm: confirmAction } = useConfirmStore();
  const [loadingId, setLoadingId] = useState<number | null>(null);

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
      title: 'Eliminar Registro de Misión',
      message: '¿Estás seguro de que quieres eliminar esta misión permanentemente?',
      variant: 'danger',
      requireValidation: true
    });
    if (!ok) return;
    
    setLoadingId(id);
    try {
      await RegistrosService.deleteRegistro(id);
      addToast('Misión eliminada correctamente', 'success');
      onRefresh?.();
    } catch (err: any) {
      addToast(err.message || 'Error al eliminar la misión', 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const getRankBadgeStyle = (r: string) => {
    switch (r?.toUpperCase()) {
      case 'S': return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'A': return 'bg-orange-500/10 border-orange-500/30 text-orange-400';
      case 'B': return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
      case 'C': return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
      case 'D': return 'bg-green-500/10 border-green-500/30 text-green-400';
      default: return 'bg-oro/10 border-oro/20 text-oro';
    }
  };

  return (
    <div className="ninja-card-oro p-1 overflow-hidden border border-oro/10">
      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-oro/10 text-oro/40 text-[10px] xl:text-xs font-black uppercase tracking-[0.3em]">
              <th className="py-6 px-8">Fecha</th>
              <th className="py-6 px-8">Código</th>
              <th className="py-6 px-8">Rango</th>
              <th className="py-6 px-8">Participantes</th>
              <th className="py-6 px-8">Recompensa</th>
              <th className="py-6 px-8">Pruebas</th>
              <th className="py-6 px-8 text-right w-36">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-oro/5 bg-black/20">
            {misiones.map((m) => {
              const participants = getParticipants(m);
              const isOwner = activeCharacter?.id === m.autor_id;
              const canManage = isOwner || isAdmin;
              const rankVal = m.subtipo || 'D';

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

                  {/* Código */}
                  <td className="py-6 px-8 font-black text-oro tracking-widest text-sm xl:text-base">
                    {m.data.codigo_mision || 'M-???'}
                  </td>

                  {/* Rango */}
                  <td className="py-6 px-8">
                    <span className={`inline-block px-3 py-1 text-[10px] font-black uppercase border ninja-clip-xs ${getRankBadgeStyle(rankVal)}`}>
                      Rango {rankVal}
                    </span>
                  </td>

                  {/* Participantes */}
                  <td className="py-6 px-8">
                    <div className="flex flex-wrap gap-2 max-w-[300px]">
                      {participants.map((p, idx) => (
                        <span 
                          key={idx} 
                          className="text-[10px] font-black text-oro/70 uppercase tracking-widest px-2.5 py-1 bg-oro/5 border border-oro/10 ninja-clip-xs"
                        >
                          {p.nombre_ninja}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Recompensa */}
                  <td className="py-6 px-8">
                    <div className="flex flex-col gap-1.5 justify-center">
                      <div className="flex items-center gap-2 text-xs font-black text-oro tracking-wider">
                        <Sparkles className="w-3.5 h-3.5 text-oro/40" />
                        <span>+{m.data.recompensa_xp || 0} XP</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-black text-oro/60 tracking-wider">
                        <Coins className="w-3.5 h-3.5 text-oro/30" />
                        <span>+{m.data.recompensa_ryous || 0} Ryos</span>
                      </div>
                    </div>
                  </td>

                  {/* Pruebas */}
                  <td className="py-6 px-8">
                    <div className="flex flex-wrap gap-2 max-w-[200px]">
                      {m.data.urls_imagenes && m.data.urls_imagenes.length > 0 ? (
                        m.data.urls_imagenes.map((url: string, idx: number) => (
                          <a 
                            key={idx} 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-oro/5 border border-oro/10 hover:border-oro/40 hover:bg-oro/10 text-[9px] font-black text-oro/40 hover:text-oro uppercase tracking-widest transition-all ninja-clip-xs"
                            title={url}
                          >
                            <LinkIcon className="w-3 h-3" />
                            <span>PRUEBA {idx + 1}</span>
                          </a>
                        ))
                      ) : (
                        <span className="text-[10px] text-oro/20 uppercase tracking-widest italic">Sin pruebas</span>
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
