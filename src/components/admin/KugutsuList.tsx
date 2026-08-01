'use client';

import { useState, useMemo } from 'react';
import { Edit2, Eye, EyeOff, Search, PlusCircle, RefreshCw, Hammer, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import KugutsuComponentEditForm from './KugutsuComponentEditForm';
import { AdminService } from '@/services/supabase/admin.service';
import { useToastStore } from '@/components/ui/Toast';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';
import { KugutsuComponente } from '@/domain/types';
import { searchIncludes } from '@/lib/utils/search';

interface KugutsuListProps {
  initialComponents: KugutsuComponente[];
}

export default function KugutsuList({ initialComponents }: KugutsuListProps) {
  const [editingComponent, setEditingComponent] = useState<KugutsuComponente | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [search, setSearch] = useState('');
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const router = useRouter();
  const addToast = useToastStore((s) => s.addToast);
  const { confirm: confirmAction } = useConfirmStore();

  const toggleActive = async (id: number, currentStatus: boolean) => {
    setLoadingId(id);
    try {
      await AdminService.saveKugutsuComponent({ id, activo: !currentStatus });
      addToast(`Componente ${!currentStatus ? 'activado' : 'desactivado'}`, 'success');
      router.refresh();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    const ok = await confirmAction({
      title: 'Eliminar Componente',
      message: `¿Estás seguro de que quieres eliminar "${name}" de forma permanente?`,
      variant: 'danger',
      confirmLabel: 'Eliminar',
    });

    if (!ok) return;

    setLoadingId(id);
    try {
      await AdminService.deleteKugutsuComponent(id);
      addToast('Componente eliminado con éxito', 'success');
      router.refresh();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const filtered = useMemo(() => {
    return initialComponents.filter((c) => {
      const matchesTab = activeTab === 'active' ? c.activo : !c.activo;
      const matchesSearch = searchIncludes(c.nombre_esp, search) ||
        searchIncludes(c.nombre_jap, search) ||
        searchIncludes(c.tipo, search);
      return matchesTab && matchesSearch;
    });
  }, [initialComponents, activeTab, search]);

  return (
    <div className="space-y-6">
      {/* Controles Superiores */}
      <div className="flex flex-col min-[1200px]:flex-row flex-wrap gap-6 justify-between items-stretch min-[1200px]:items-center bg-neutral-800/40 p-6 sm:p-10 xl:p-12 border border-oro/5 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-oro/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

        {/* Tabs Activo/Archivado */}
        <div className="flex gap-2 p-1.5 bg-black/40 border border-oro/10 ninja-box w-full min-[1200px]:w-auto justify-center">
          {(['active', 'inactive'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 sm:flex-initial text-center px-4 sm:px-8 py-3 xl:py-4 font-black uppercase tracking-[0.2em] tracking-wider transition-all text-caption sm:text-caption xl:text-xs ${activeTab === tab ? 'bg-oro text-naranja-naruto shadow-lg' : 'text-oro/40 hover:text-oro hover:bg-oro/5'}`}
              style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
            >
              {tab === 'active' ? 'ACTIVOS' : 'INACTIVOS'}{' '}
              <span className={`ml-2 opacity-40 ${activeTab === tab ? 'text-naranja-naruto/60' : ''}`}>
                ({initialComponents.filter((e) => (tab === 'active' ? e.activo : !e.activo)).length})
              </span>
            </button>
          ))}
        </div>

        {/* Filtro búsqueda + botón nuevo */}
        <div className="flex flex-col sm:flex-row flex-wrap w-full min-[1200px]:w-auto gap-4 sm:gap-6 items-stretch sm:items-center">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-oro/40" />
            <input
              type="text"
              placeholder="BUSCAR COMPONENTE..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/60 border border-oro/15 py-3 xl:py-4 pl-12 pr-4 text-oro font-black tracking-widest text-caption sm:text-xs placeholder:text-oro/20 outline-none focus:border-oro/40 transition-all ninja-box uppercase"
            />
          </div>

          <button
            onClick={() => setIsAdding(true)}
            className="ninja-btn-oro py-3.5 px-6 sm:px-8 flex items-center justify-center gap-3 text-caption xl:text-xs font-black uppercase tracking-wider"
          >
            <PlusCircle className="w-5 h-5" />
            NUEVO COMPONENTE
          </button>
        </div>
      </div>

      {/* Tabla de Resultados */}
      <div className="ninja-card-oro p-2 overflow-hidden border border-oro/10 bg-black/30">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
            <thead>
              <tr className="border-b border-oro/10 text-oro/70 text-caption xl:text-xs font-black uppercase tracking-[0.25em] bg-black/40">
                <th className="py-4 px-6 w-[8%] text-center">Icono</th>
                <th className="py-4 px-6 w-[27%]">Nombre en Español</th>
                <th className="py-4 px-6 w-[27%]">Nombre en Japonés</th>
                <th className="py-4 px-6 w-[18%]">Tipo de Componente</th>
                <th className="py-4 px-6 w-[20%] text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-oro/5 bg-black/20 text-xs xl:text-sm text-oro/80">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-oro/30 font-black uppercase tracking-widest text-xs">
                    No se encontraron componentes en esta sección.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-oro/5 transition-colors group">
                    {/* Icono */}
                    <td className="py-3 px-6 text-center">
                      <div className="w-10 h-10 rounded-full border border-oro/20 bg-black/60 overflow-hidden mx-auto flex items-center justify-center shadow-[0_0_10px_rgba(212,175,55,0.05)]">
                        {c.url_image ? (
                          <img src={c.url_image} alt={c.nombre_esp} className="w-full h-full object-cover" />
                        ) : (
                          <Hammer className="w-4 h-4 text-oro/30" />
                        )}
                      </div>
                    </td>

                    {/* Nombre Español */}
                    <td className="py-3 px-6 font-semibold uppercase tracking-wider text-oro">
                      {c.nombre_esp}
                    </td>

                    {/* Nombre Japonés */}
                    <td className="py-3 px-6 font-medium text-oro/70 uppercase tracking-wider font-mono">
                      {c.nombre_jap}
                    </td>

                    {/* Tipo */}
                    <td className="py-3 px-6">
                      <span className={`inline-block px-2.5 py-1 text-[10px] font-black uppercase rounded ${c.tipo === 'cuerpo'
                        ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                        : c.tipo === 'extremidad'
                          ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                          : 'bg-purple-500/10 border border-purple-500/20 text-purple-400'
                        }`}>
                        {c.tipo === 'cuerpo' ? 'Kugutsu Sotai (Cuerpo de Marioneta)' : c.tipo === 'extremidad' ? 'Kugutsu Shishi (Extremidades de Marioneta)' : 'Kakushi Karakuri (Accesorio Oculto)'}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-6 text-center">
                      <div className="flex items-center justify-center gap-3">
                        {/* Editar */}
                        <button
                          onClick={() => setEditingComponent(c)}
                          className="p-2 border border-oro/20 hover:border-oro bg-oro/[0.03] text-oro/60 hover:text-oro transition-all ninja-clip-xs"
                          title="Editar Componente"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Visibilidad */}
                        <button
                          onClick={() => toggleActive(c.id, c.activo)}
                          disabled={loadingId === c.id}
                          className={`p-2 border transition-all ninja-clip-xs ${c.activo
                            ? 'border-emerald-500/30 hover:border-emerald-500 bg-emerald-500/5 text-emerald-400'
                            : 'border-red-500/30 hover:border-red-500 bg-red-500/5 text-red-400'
                            }`}
                          title={c.activo ? 'Desactivar Componente' : 'Activar Componente'}
                        >
                          {loadingId === c.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : c.activo ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </button>

                        {/* Eliminar */}
                        <button
                          onClick={() => handleDelete(c.id, c.nombre_esp)}
                          disabled={loadingId === c.id}
                          className="p-2 border border-red-600/30 hover:border-red-500 bg-red-600/5 text-red-400 hover:text-red-300 transition-all ninja-clip-xs"
                          title="Eliminar de forma permanente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Agregar */}
      {isAdding && (
        <KugutsuComponentEditForm onCancel={() => setIsAdding(false)} />
      )}

      {/* Modal Editar */}
      {editingComponent && (
        <KugutsuComponentEditForm
          component={editingComponent}
          onCancel={() => setEditingComponent(null)}
        />
      )}
    </div>
  );
}
