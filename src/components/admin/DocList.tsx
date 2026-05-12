'use client';

import { useState, useMemo } from 'react';
import { Edit2, ExternalLink, Hash, Trash2, Eye, EyeOff, PlusCircle, Search, Filter, Archive } from 'lucide-react';
import DocEditForm from './DocEditForm';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function DocList({ initialDocs, categories, defaultCategory, showSubcategory = true }: { initialDocs: any[], categories: any[], defaultCategory?: string, showSubcategory?: boolean }) {
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  const supabase = createClient();
  const router = useRouter();

  // Función para cambiar estado rápido
  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('documentos_sistemas')
      .update({ activo: !currentStatus })
      .eq('id', id);

    if (!error) {
      router.refresh();
    } else {
      alert("Error al cambiar visibilidad: " + error.message);
    }
  };

  const handleDelete = async (id: string, titulo: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${titulo}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from('documentos_sistemas').delete().eq('id', id);
    if (!error) router.refresh();
  };

  // Lógica de filtrado
  const filteredDocs = useMemo(() => {
    return initialDocs.filter(doc => {
      const matchesTab = activeTab === 'active' ? doc.activo : !doc.activo;
      const matchesSearch = doc.titulo.toLowerCase().includes(search.toLowerCase()) || 
                           doc.clave.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || doc.categoria === categoryFilter;
      return matchesTab && matchesSearch && matchesCategory;
    });
  }, [initialDocs, activeTab, search, categoryFilter]);

  return (
    <div className="space-y-6">
      {/* Controles Superiores */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800">
        <div className="flex gap-2 p-1 bg-zinc-950 border border-zinc-800 rounded-2xl">
          <button 
            onClick={() => setActiveTab('active')}
            className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'active' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-zinc-500 hover:text-white'}`}
          >
            ACTIVOS ({initialDocs.filter(d => d.activo).length})
          </button>
          <button 
            onClick={() => setActiveTab('inactive')}
            className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'inactive' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
          >
            ARCHIVADOS ({initialDocs.filter(d => !d.activo).length})
          </button>
        </div>

        <div className="flex w-full md:w-auto gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input 
              type="text" 
              placeholder="Buscar título o clave..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-orange-500 outline-none transition-all"
            />
          </div>
          
          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500 transition-all"
          >
            <option value="all">Todas las categorías</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.slug}>{cat.nombre}</option>
            ))}
          </select>

          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-orange-500/20"
          >
            <PlusCircle className="w-5 h-5" />
            NUEVO
          </button>
        </div>
      </div>

      {/* Tabla de Documentos */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-800/30 border-b border-zinc-800">
              <th className="p-6 text-xs font-black uppercase tracking-widest text-zinc-500">Documento</th>
              <th className="p-6 text-xs font-black uppercase tracking-widest text-zinc-500 text-center">Categoría</th>
              <th className="p-6 text-xs font-black uppercase tracking-widest text-zinc-500 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {filteredDocs.map((doc) => (
              <tr key={doc.id} className="hover:bg-zinc-800/20 transition-colors group">
                <td className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                      {doc.url_imagen ? (
                        <img src={doc.url_imagen} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Hash className="w-5 h-5 text-zinc-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-white group-hover:text-orange-500 transition-colors">{doc.titulo}</p>
                      <p className="text-xs text-zinc-500 font-mono">{doc.clave}</p>
                    </div>
                  </div>
                </td>
                <td className="p-6 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="px-4 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      {doc.categoria}
                    </span>
                    {showSubcategory && doc.subcategoria && (
                      <span className="text-[9px] text-orange-500/70 font-bold uppercase tracking-tighter">
                        {doc.subcategoria}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-6">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => toggleStatus(doc.id, doc.activo)}
                      className={`p-2.5 rounded-xl border transition-all ${doc.activo ? 'bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500 hover:text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:bg-zinc-700 hover:text-white'}`}
                      title={doc.activo ? "Ocultar documento" : "Publicar documento"}
                    >
                      {doc.activo ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    
                    <button 
                      onClick={() => setEditingDoc(doc)}
                      className="p-2.5 bg-zinc-800 border border-zinc-700 text-white rounded-xl hover:bg-zinc-700 transition-all"
                      title="Editar detalles"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button 
                      onClick={() => handleDelete(doc.id, doc.titulo)}
                      className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                      title="Borrar permanentemente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredDocs.length === 0 && (
              <tr>
                <td colSpan={3} className="p-20 text-center text-zinc-600 font-bold italic">
                  No se han encontrado documentos con estos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(editingDoc || isAdding) && (
        <DocEditForm 
          doc={editingDoc} 
          categories={categories}
          defaultCategory={defaultCategory}
          onCancel={() => {
            setEditingDoc(null);
            setIsAdding(false);
          }} 
          showSubcategory={showSubcategory}
        />
      )}
    </div>
  );
}
