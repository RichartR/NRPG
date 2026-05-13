'use client';

import { useState, useMemo } from 'react';
import { Edit2, ExternalLink, Hash, Trash2, Eye, EyeOff, PlusCircle, Search, Filter, Archive, RefreshCw, FileText } from 'lucide-react';
import DocEditForm from './DocEditForm';
import { useRouter } from 'next/navigation';
import { AdminService } from '@/services/supabase/admin.service';
import { useToastStore } from '@/components/ui/Toast';

export default function DocList({ initialDocs, categories, defaultCategory, showSubcategory = true }: { initialDocs: any[], categories: any[], defaultCategory?: string, showSubcategory?: boolean }) {
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  const router = useRouter();
  const addToast = useToastStore(state => state.addToast);

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    setLoadingId(id);
    try {
      await AdminService.saveDocument({ id, activo: !currentStatus });
      addToast(`Documento ${!currentStatus ? 'activado' : 'archivado'}`, 'success');
      router.refresh();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string, titulo: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${titulo}"?`)) return;
    try {
      await AdminService.deleteDocument(id);
      addToast("Documento eliminado permanentemente", "success");
      router.refresh();
    } catch (err: any) {
      addToast(err.message, "error");
    }
  };

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
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-zinc-900/30 p-8 rounded-[2.5rem] border border-zinc-800/50 backdrop-blur-md">
        <div className="flex gap-3 p-1.5 bg-black border border-zinc-800 rounded-[1.5rem]">
          {['active', 'inactive'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                activeTab === tab 
                ? 'bg-orange-600 text-white shadow-xl shadow-orange-900/20' 
                : 'text-zinc-500 hover:text-white'
              }`}
            >
              {tab === 'active' ? 'Activos' : 'Archivados'} 
              <span className="ml-2 opacity-40">({initialDocs.filter(d => tab === 'active' ? d.activo : !d.activo).length})</span>
            </button>
          ))}
        </div>

        <div className="flex w-full md:w-auto gap-4">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input 
              type="text" 
              placeholder="BUSCAR DOCUMENTO..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-2xl py-4 pl-12 pr-6 text-xs font-bold text-white focus:border-orange-500 outline-none transition-all placeholder:text-zinc-700"
            />
          </div>
          
          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-black border border-zinc-800 rounded-2xl px-6 py-4 text-xs font-bold text-white outline-none focus:border-orange-500 transition-all appearance-none pr-12 cursor-pointer"
          >
            <option value="all">TODAS LAS CATEGORÍAS</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.slug}>{cat.nombre.toUpperCase()}</option>
            ))}
          </select>

          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-3 px-8 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-orange-500/20 active:scale-95"
          >
            <PlusCircle className="w-5 h-5" />
            NUEVO
          </button>
        </div>
      </div>

      <div className="bg-zinc-950 border border-zinc-900 rounded-[3rem] overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-black border-b border-zinc-900">
              <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Documento</th>
              <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 text-center">Clasificación</th>
              <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 text-right">Protocolos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {filteredDocs.map((doc) => (
              <tr key={doc.id} className="hover:bg-zinc-900/40 transition-colors group">
                <td className="p-8">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden">
                      {doc.url_imagen ? (
                        <img src={doc.url_imagen} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                      ) : (
                        <FileText className="w-6 h-6 text-zinc-700 group-hover:text-orange-500 transition-colors" />
                      )}
                    </div>
                    <div>
                      <p className="text-lg font-black text-white uppercase italic tracking-tighter group-hover:text-orange-500 transition-colors">{doc.titulo}</p>
                      <p className="text-[10px] text-zinc-600 font-mono font-bold mt-1 uppercase">CLAVE: {doc.clave}</p>
                    </div>
                  </div>
                </td>
                <td className="p-8">
                  <div className="flex flex-col items-center gap-2">
                    <span className="px-5 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-[9px] font-black uppercase tracking-widest text-zinc-400">
                      {doc.categoria}
                    </span>
                    {showSubcategory && doc.subcategoria && (
                      <span className="text-[8px] text-orange-500/50 font-black uppercase tracking-widest bg-orange-500/5 px-3 py-1 rounded-full border border-orange-500/10">
                        {doc.subcategoria}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-8">
                  <div className="flex justify-end gap-3">
                    <button 
                      onClick={() => toggleStatus(doc.id, doc.activo)}
                      disabled={loadingId === doc.id}
                      className={`p-3.5 rounded-xl border transition-all ${doc.activo ? 'bg-orange-500/10 border-orange-500/20 text-orange-500 hover:bg-orange-600 hover:text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-600 hover:bg-zinc-800 hover:text-white'}`}
                    >
                      {loadingId === doc.id ? <RefreshCw className="w-5 h-5 animate-spin" /> : (doc.activo ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />)}
                    </button>
                    
                    <button 
                      onClick={() => setEditingDoc(doc)}
                      className="p-3.5 bg-white text-black rounded-xl hover:bg-zinc-200 transition-all active:scale-95 shadow-lg shadow-white/5"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>

                    <button 
                      onClick={() => handleDelete(doc.id, doc.titulo)}
                      className="p-3.5 bg-red-600/10 border border-red-600/20 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all active:scale-95"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredDocs.length === 0 && (
              <tr>
                <td colSpan={3} className="p-32 text-center">
                   <p className="text-zinc-700 font-black uppercase italic tracking-[0.3em] text-sm">Base de datos sin registros filtrados</p>
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
