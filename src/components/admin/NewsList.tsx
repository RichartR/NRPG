'use client';

import { useState, useMemo } from 'react';
import { Edit2, Trash2, PlusCircle, Search, RefreshCw, FileText, Eye, EyeOff } from 'lucide-react';
import NewsEditForm from './NewsEditForm';
import { useRouter } from 'next/navigation';
import { AdminService } from '@/services/supabase/admin.service';
import { useToastStore } from '@/components/ui/Toast';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';
import { NinjaSelect } from '@/components/ui/Fields';

interface NewsListProps {
  initialDocs: any[];
}

export default function NewsList({ initialDocs }: NewsListProps) {
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const router = useRouter();
  const addToast = useToastStore(state => state.addToast);
  const { confirm: confirmAction } = useConfirmStore();

  const toggleStatus = async (id: number, currentStatus: boolean) => {
    setLoadingId(id);
    try {
      await AdminService.saveNewsItem({ id, activo: !currentStatus });
      addToast(`Anuncio ${!currentStatus ? 'activado' : 'archivado'}`, 'success');
      router.refresh();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: number, titulo: string) => {
    const ok = await confirmAction({
      title: 'Eliminar Anuncio',
      message: `¿Estás seguro de que quieres eliminar permanentemente el anuncio "${titulo}" del índice?`,
      variant: 'danger',
      requireValidation: true
    });
    if (!ok) return;

    try {
      await AdminService.deleteNewsItem(id);
      addToast("Anuncio eliminado permanentemente", "success");
      router.refresh();
    } catch (err: any) {
      addToast(err.message, "error");
    }
  };

  const filteredDocs = useMemo(() => {
    return initialDocs.filter(doc => {
      const isDocActive = doc.activo !== false;
      const matchesTab = activeTab === 'active' ? isDocActive : !isDocActive;
      const matchesSearch = doc.titulo.toLowerCase().includes(search.toLowerCase()) ||
        doc.discord_msg_id.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || doc.categoria === categoryFilter;
      return matchesTab && matchesSearch && matchesCategory;
    });
  }, [initialDocs, activeTab, search, categoryFilter]);

  const categories = ['Noticia', 'Parche', 'Evento'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col min-[1600px]:flex-row flex-wrap gap-6 justify-between items-stretch min-[1600px]:items-center bg-[#0A0A0A]/40 p-6 sm:p-10 xl:p-12 border border-oro/5 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-oro/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

        {/* Selector de Estado */}
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
              <span className={`ml-2 opacity-40 ${activeTab === tab ? 'text-rojo-sangre/60' : ''}`}>
                ({initialDocs.filter(d => tab === 'active' ? d.activo !== false : d.activo === false).length})
              </span>
            </button>
          ))}
        </div>

        {/* Buscador e Inputs de Filtros */}
        <div className="flex flex-col sm:flex-row flex-wrap w-full min-[1600px]:w-auto gap-4 sm:gap-6 items-stretch sm:items-center">
          {/* Buscador */}
          <div className="relative flex-1 sm:w-64 lg:w-72 xl:w-80">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-oro/40" />
            <input
              type="text"
              placeholder="BUSCAR ANUNCIO POR TÍTULO O ID DE DISCORD..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-black/20 border border-oro/10 py-3 xl:py-4 pl-14 pr-8 text-[9px] sm:text-[10px] xl:text-xs font-black text-oro focus:border-oro/40 outline-none transition-all placeholder:text-oro/20 uppercase tracking-widest"
              style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
            />
          </div>

          {/* Filtro de Categoría */}
          <div className="relative w-full sm:w-auto">
            <NinjaSelect
              variant="filter"
              value={categoryFilter}
              onChange={(val) => setCategoryFilter(val)}
              placeholder="TODAS LAS CATEGORÍAS"
              options={[
                { label: 'TODAS LAS CATEGORÍAS', value: 'all' },
                ...categories.map((cat: string) => ({ label: cat.toUpperCase(), value: cat }))
              ]}
              className="w-full sm:w-auto"
            />
          </div>

          {/* Botón de Creación */}
          <button
            onClick={() => setIsAdding(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 sm:px-10 py-3 xl:py-4 bg-rojo-sangre hover:brightness-125 text-oro font-black text-[9px] sm:text-[10px] xl:text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-rojo-sangre/20 active:scale-95 whitespace-nowrap"
            style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
          >
            <PlusCircle className="w-5 h-5 shrink-0" />
            NUEVO ANUNCIO
          </button>
        </div>
      </div>

      {/* Tabla de Gestión */}
      <div className="ninja-card-oro p-4 sm:p-8 xl:p-10 overflow-hidden relative">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-oro/10">
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.25em] text-oro/40 w-24">Miniatura</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.25em] text-oro/40">Título / Categoría</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.25em] text-oro/40 w-64">ID Mensaje Discord</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.25em] text-oro/40 w-48 text-right">Operaciones Shinobi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-oro/5">
              {filteredDocs.map((item) => (
                <tr key={item.id} className="hover:bg-oro/[0.02] transition-colors group">
                  {/* Miniatura */}
                  <td className="p-6 w-24">
                    <div className="w-16 h-12 bg-black/60 border border-oro/15 overflow-hidden flex items-center justify-center shrink-0" style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}>
                      {item.url_imagen ? (
                        <img src={item.url_imagen} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                      ) : (
                        <FileText className="w-5 h-5 text-oro/20" />
                      )}
                    </div>
                  </td>

                  {/* Título / Categoría */}
                  <td className="p-6">
                    <div className="space-y-1.5">
                      <p className="text-oro font-black text-sm xl:text-base uppercase tracking-tight leading-snug max-w-2xl">{item.titulo}</p>
                      <span className="inline-block text-[8px] xl:text-[9px] font-black bg-rojo-sangre text-oro px-2 py-0.5 uppercase tracking-widest" style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}>
                        {item.categoria.toUpperCase()}
                      </span>
                    </div>
                  </td>

                  {/* ID Discord */}
                  <td className="p-6 w-64">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono text-oro/60 bg-black/50 px-3 py-1.5 border border-oro/5 font-bold">{item.discord_msg_id}</code>
                    </div>
                  </td>

                  {/* Acciones */}
                  <td className="p-6 w-48 text-right">
                    <div className="flex justify-end gap-4">
                      {/* Botón Archivar/Activar */}
                      <button
                        onClick={() => toggleStatus(item.id, item.activo !== false)}
                        disabled={loadingId === item.id}
                        className={`p-3 transition-all border ${item.activo !== false ? 'bg-oro/10 border-oro/20 text-oro hover:bg-oro hover:text-rojo-sangre' : 'bg-black/40 border-oro/5 text-oro/20 hover:border-oro/40 hover:text-oro'}`}
                        style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                        title={item.activo !== false ? "Archivar Registro" : "Activar Registro"}
                      >
                        {loadingId === item.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : (item.activo !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />)}
                      </button>

                      {/* Botón Editar */}
                      <button
                        onClick={() => setEditingItem(item)}
                        className="p-3 bg-black/40 hover:bg-oro/10 border border-oro/10 hover:border-oro/30 text-oro transition-all active:scale-90 cursor-pointer"
                        style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                        title="Modificar Registro"
                      >
                        <Edit2 className="w-4 h-4 text-oro" />
                      </button>

                      {/* Botón Eliminar */}
                      <button
                        onClick={() => handleDelete(item.id, item.titulo)}
                        className="p-3 bg-black/40 hover:bg-rojo-sangre border border-oro/10 hover:border-rojo-sangre/50 text-oro hover:text-white transition-all active:scale-90 cursor-pointer"
                        style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                        title="Eliminar Registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-32 text-center">
                    <p className="text-oro/10 font-black uppercase tracking-[0.5em] text-xs sm:text-sm italic">SISTEMA SIN REGISTROS DE NOTICIAS</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Formulario de Edición/Creación Modal */}
      {(editingItem || isAdding) && (
        <NewsEditForm
          newsItem={editingItem}
          onCancel={() => {
            setEditingItem(null);
            setIsAdding(false);
          }}
        />
      )}
    </div>
  );
}
