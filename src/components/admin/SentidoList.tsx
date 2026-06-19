'use client';

import { useState, useMemo } from 'react';
import { Edit2, Eye, EyeOff, Search, PlusCircle, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import SentidoEditForm from './SentidoEditForm';
import { AdminService } from '@/services/supabase/admin.service';
import { useToastStore } from '@/components/ui/Toast';
import { Sentido, RamaClan, SubEspecialidad, RamaSentido } from '@/domain/types';
import { searchAny } from '@/lib/utils/search';

interface SentidoListProps {
  initialSentidos: Sentido[];
  ramas: RamaClan[];
  subEspecialidades: SubEspecialidad[];
  ramaSentidos: RamaSentido[];
}

export default function SentidoList({ initialSentidos, ramas, subEspecialidades, ramaSentidos }: SentidoListProps) {
  const [editingSentido, setEditingSentido] = useState<Sentido | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [search, setSearch] = useState('');
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const router = useRouter();
  const addToast = useToastStore((s) => s.addToast);

  const toggleActive = async (id: number, currentStatus: boolean) => {
    setLoadingId(id);
    try {
      await AdminService.saveSentido({ id, activo: !currentStatus });
      addToast(`Sentido ${!currentStatus ? 'activado' : 'archivado'}`, 'success');
      router.refresh();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const filtered = useMemo(() => {
    return initialSentidos.filter((s) => {
      const matchesTab = activeTab === 'active' ? s.activo : !s.activo;
      const matchesSearch = searchAny(search, [s.nombre]);
      return matchesTab && matchesSearch;
    });
  }, [initialSentidos, activeTab, search]);

  const editingVinculaciones = editingSentido
    ? ramaSentidos.filter((re) => re.sentido_id === editingSentido.id)
    : [];

  return (
    <div className="space-y-6">
      {/* Controles Superiores */}
      <div className="flex flex-col min-[1600px]:flex-row flex-wrap gap-6 justify-between items-stretch min-[1600px]:items-center bg-neutral-800/40 p-6 sm:p-10 xl:p-12 border border-oro/5 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-oro/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

        {/* Tabs Activo/Archivado */}
        <div className="flex gap-2 p-1.5 bg-black/40 border border-oro/10 ninja-box w-full min-[1600px]:w-auto justify-center">
          {(['active', 'inactive'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 sm:flex-initial text-center px-4 sm:px-8 py-3 xl:py-4 font-black uppercase tracking-[0.2em] transition-all text-caption sm:text-caption xl:text-xs ${activeTab === tab ? 'bg-oro text-rojo-sangre shadow-lg' : 'text-oro/40 hover:text-oro hover:bg-oro/5'}`}
              style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
            >
              {tab === 'active' ? 'ACTIVOS' : 'ARCHIVADOS'}{' '}
              <span className={`ml-2 opacity-40 ${activeTab === tab ? 'text-rojo-sangre/60' : ''}`}>
                ({initialSentidos.filter((s) => (tab === 'active' ? s.activo : !s.activo)).length})
              </span>
            </button>
          ))}
        </div>

        {/* Filtro búsqueda + botón nuevo */}
        <div className="flex flex-col sm:flex-row flex-wrap w-full min-[1600px]:w-auto gap-4 sm:gap-6 items-stretch sm:items-center">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-oro/40" />
            <input
              type="text"
              placeholder="BUSCAR SENTIDO..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/20 border border-oro/10 py-3 xl:py-4 pl-12 pr-6 text-caption sm:text-caption xl:text-xs font-black text-oro focus:border-oro/40 outline-none transition-all placeholder:text-oro/20 uppercase tracking-widest"
              style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
            />
          </div>

          <button
            onClick={() => setIsAdding(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 sm:px-10 py-3 xl:py-4 bg-rojo-sangre hover:brightness-125 text-oro font-black text-caption sm:text-caption xl:text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-rojo-sangre/20 active:scale-95 whitespace-nowrap"
            style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
          >
            <PlusCircle className="w-5 h-5 shrink-0" />
            NUEVO SENTIDO
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="ninja-card-oro overflow-hidden border border-oro/10 bg-black/40 backdrop-blur-sm">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[500px] table-fixed">
            <thead>
              <tr className="border-b border-oro/10 text-oro/70 text-caption xl:text-xs font-black uppercase tracking-[0.3em] bg-black/20">
                <th className="py-6 px-8 w-[70%]">Nombre</th>
                <th className="py-6 px-8 text-right w-[30%]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-oro/5 bg-black/40">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-oro/5 transition-colors group">
                  {/* Nombre */}
                  <td className="py-5 px-8">
                    <h3 className="text-base font-black text-oro uppercase italic tracking-tighter leading-none">{s.nombre}</h3>
                  </td>

                  {/* Acciones */}
                  <td className="py-5 px-8 text-right">
                    <div className="flex items-center justify-end gap-2.5">
                      <button
                        onClick={() => toggleActive(s.id, s.activo)}
                        disabled={loadingId === s.id}
                        className={`p-2.5 transition-all border ninja-clip-xs ${s.activo ? 'bg-oro/10 border-oro/20 text-oro hover:bg-oro hover:text-rojo-sangre' : 'bg-black/40 border-oro/5 text-oro/20 hover:border-oro/40 hover:text-oro'}`}
                        title={s.activo ? 'Archivar' : 'Activar'}
                      >
                        {loadingId === s.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : s.activo ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => setEditingSentido(s)}
                        className="p-2.5 bg-oro text-rojo-sangre hover:brightness-110 transition-all active:scale-95 shadow-lg shadow-oro/10 ninja-clip-xs"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={2} className="py-24 text-center">
                    <p className="text-oro/10 font-black uppercase italic tracking-[0.3em] text-xs">Sin sentidos registrados</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal crear/editar */}
      {(editingSentido || isAdding) && (
        <SentidoEditForm
          sentido={editingSentido ?? undefined}
          ramas={ramas}
          subEspecialidades={subEspecialidades}
          vinculaciones={editingVinculaciones}
          onCancel={() => {
            setEditingSentido(null);
            setIsAdding(false);
          }}
        />
      )}
    </div>
  );
}
