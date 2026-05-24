'use client';

import { useState, useMemo } from 'react';
import { Search, PlusCircle, Edit2, Eye, EyeOff, Trash2, Dumbbell, RefreshCw } from 'lucide-react';
import { Entrenamiento, RamaClan, SubEspecialidad } from '@/domain/types';
import { AdminService } from '@/services/supabase/admin.service';
import { useToastStore } from '@/components/ui/Toast';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';
import { useRouter } from 'next/navigation';
import EntrenamientoEditForm from './EntrenamientoEditForm';

interface Props {
  initialEntrenamientos: Entrenamiento[];
  ramas: RamaClan[];
  subEspecialidades: SubEspecialidad[];
}

export default function EntrenamientoList({ initialEntrenamientos, ramas, subEspecialidades }: Props) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [editingEnt, setEditingEnt] = useState<Entrenamiento | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const addToast = useToastStore(state => state.addToast);
  const router = useRouter();
  const { confirm: confirmAction } = useConfirmStore();

  const filteredData = useMemo(() => {
    return initialEntrenamientos.filter(ent => {
      const matchesTab = activeTab === 'active' ? ent.activo : !ent.activo;
      const matchesSearch =
        ent.nombre_esp.toLowerCase().includes(search.toLowerCase()) ||
        ent.nombre_jp.toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [initialEntrenamientos, activeTab, search]);

  const toggleActive = async (ent: Entrenamiento) => {
    setLoadingId(ent.id);
    try {
      await AdminService.saveEntrenamiento({ ...ent, activo: !ent.activo });
      addToast(`Entrenamiento ${!ent.activo ? 'activado' : 'archivado'}`, 'success');
      router.refresh();
    } catch (error: any) {
      addToast(error.message, 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirmAction({
      title: 'Eliminar Entrenamiento',
      message: '¿Estás seguro de eliminar este entrenamiento?',
      variant: 'danger',
      requireValidation: true
    });
    if (!ok) return;
    try {
      await AdminService.deleteEntrenamiento(id);
      addToast('Entrenamiento eliminado', 'success');
      router.refresh();
    } catch (error: any) {
      addToast(error.message, 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Controles Superiores */}
      <div className="flex flex-col min-[1600px]:flex-row flex-wrap gap-6 justify-between items-stretch min-[1600px]:items-center bg-[#0A0A0A]/40 p-6 sm:p-10 xl:p-12 border border-oro/5 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-oro/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

        <div className="flex gap-2 p-1.5 bg-black/40 border border-oro/10 ninja-box w-full min-[1600px]:w-auto justify-center">
          {['active', 'inactive'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 sm:flex-initial text-center px-4 sm:px-10 py-3 xl:py-4 font-black uppercase tracking-[0.2em] transition-all text-[9px] sm:text-[10px] xl:text-xs ${activeTab === tab
                  ? 'bg-oro text-rojo-sangre shadow-lg'
                  : 'text-oro/40 hover:text-oro hover:bg-oro/5'
                }`}
              style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
            >
              {tab === 'active' ? 'ACTIVOS' : 'ARCHIVADOS'}
              <span className={`ml-2 opacity-40 ${activeTab === tab ? 'text-rojo-sangre/60' : ''}`}>({initialEntrenamientos.filter(e => tab === 'active' ? e.activo : !e.activo).length})</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap w-full min-[1600px]:w-auto gap-4 sm:gap-6 items-stretch sm:items-center">
          <div className="relative flex-1 sm:w-64 lg:w-72 xl:w-80">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-oro/40" />
            <input
              type="text"
              placeholder="BUSCAR ENTRENAMIENTO..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/20 border border-oro/10 py-3 xl:py-4 pl-14 pr-8 text-[9px] sm:text-[10px] xl:text-xs font-black text-oro focus:border-oro/40 outline-none transition-all placeholder:text-oro/20 uppercase tracking-widest"
              style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
            />
          </div>

          <button
            onClick={() => setIsAdding(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 sm:px-10 py-3 xl:py-4 bg-rojo-sangre hover:brightness-125 text-oro font-black text-[9px] sm:text-[10px] xl:text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-rojo-sangre/20 active:scale-95 whitespace-nowrap"
            style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
          >
            <PlusCircle className="w-5 h-5 shrink-0" />
            NUEVO ENTRENAMIENTO
          </button>
        </div>
      </div>

      {/* Listado */}
      <div className="ninja-card-oro overflow-hidden border border-oro/10 bg-black/40 backdrop-blur-sm">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[800px] table-fixed">
            <thead>
              <tr className="border-b border-oro/10 text-oro/70 text-[10px] xl:text-xs font-black uppercase tracking-[0.3em] bg-black/20">
                <th className="py-6 px-8 w-[10%]">Símbolo</th>
                <th className="py-6 px-8 w-[40%]">Entrenamiento</th>
                <th className="py-6 px-8 w-[30%]">Vinculación</th>
                <th className="py-6 px-8 w-[10%] text-center">Estado</th>
                <th className="py-6 px-8 text-right w-[10%]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-oro/5 bg-black/40">
              {filteredData.map((ent) => {
                const rama = ramas.find(r => r.id === ent.id_ramaclan);
                const sub = subEspecialidades.find(s => s.id === ent.id_subespecialidad);

                return (
                  <tr key={ent.id} className="hover:bg-oro/5 transition-colors group">
                    {/* Símbolo */}
                    <td className="py-5 px-8">
                      <div
                        className="w-12 h-12 bg-black/40 border border-oro/10 overflow-hidden flex items-center justify-center transition-all ninja-clip-xs"
                      >
                        <Dumbbell className="w-5 h-5 text-oro/30 group-hover:text-oro transition-colors" />
                      </div>
                    </td>

                    {/* Nombre */}
                    <td className="py-5 px-8">
                      <h3 className="text-base font-black text-oro uppercase italic tracking-tighter leading-none mb-0.5">{ent.nombre_esp}</h3>
                      <p className="text-oro/40 text-[9px] font-black uppercase tracking-widest mt-1 leading-relaxed">{ent.nombre_jp}</p>
                    </td>

                    {/* Vinculación */}
                    <td className="py-5 px-8">
                      <div className="flex flex-col gap-1.5 w-fit">
                        {rama && (
                          <span
                            className="text-[8px] font-black text-oro/60 uppercase tracking-widest bg-oro/5 px-3 py-1 border border-oro/10 inline-block ninja-clip-xs"
                          >
                            {rama.nombre}
                          </span>
                        )}
                        {sub && (
                          <span
                            className="text-[8px] font-black text-oro/40 uppercase tracking-widest bg-black/20 px-3 py-1 border border-oro/5 inline-block ninja-clip-xs"
                          >
                            {sub.nombre}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="py-5 px-8 text-center">
                      <span className={`inline-block px-3 py-1 text-[9px] font-black border uppercase tracking-wider ninja-clip-xs ${ent.activo
                          ? 'bg-oro/10 text-oro border-oro/20'
                          : 'bg-black/60 text-oro/20 border-oro/5'
                        }`}>
                        {ent.activo ? 'ACTIVO' : 'ARCHIVADO'}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="py-5 px-8 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          onClick={() => toggleActive(ent)}
                          disabled={loadingId === ent.id}
                          className={`p-2.5 transition-all border ninja-clip-xs ${ent.activo
                              ? 'bg-oro/10 border-oro/20 text-oro hover:bg-oro hover:text-rojo-sangre'
                              : 'bg-black/40 border-oro/5 text-oro/20 hover:border-oro/40 hover:text-oro'
                            }`}
                          title={ent.activo ? "Archivar Registro" : "Activar Registro"}
                        >
                          {loadingId === ent.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : (ent.activo ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />)}
                        </button>
                        <button
                          onClick={() => setEditingEnt(ent)}
                          className="p-2.5 bg-oro text-rojo-sangre hover:brightness-110 transition-all active:scale-95 shadow-lg shadow-oro/10 ninja-clip-xs"
                          title="Editar Registro"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(ent.id)}
                          className="p-2.5 bg-rojo-sangre/10 border border-rojo-sangre/20 text-rojo-sangre hover:bg-rojo-sangre hover:text-oro transition-all active:scale-95 ninja-clip-xs"
                          title="Eliminar Registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <p className="text-oro/10 font-black uppercase italic tracking-[0.3em] text-xs">Sin entrenamientos registrados</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(editingEnt || isAdding) && (
        <EntrenamientoEditForm
          entrenamiento={editingEnt}
          ramas={ramas}
          subEspecialidades={subEspecialidades}
          onCancel={() => {
            setEditingEnt(null);
            setIsAdding(false);
          }}
        />
      )}
    </div>
  );
}
