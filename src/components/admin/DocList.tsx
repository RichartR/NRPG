'use client';

import { useState, useMemo } from 'react';
import { Edit2, ExternalLink, Hash, Trash2, Eye, EyeOff, PlusCircle, Search, Filter, Archive, RefreshCw, FileText } from 'lucide-react';
import DocEditForm from './DocEditForm';
import { useRouter } from 'next/navigation';
import { AdminService } from '@/services/supabase/admin.service';
import { useToastStore } from '@/components/ui/Toast';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';

export default function DocList({ initialDocs, categories, defaultCategory, showSubcategory = true }: { initialDocs: any[], categories: any[], defaultCategory?: string, showSubcategory?: boolean }) {
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  const router = useRouter();
  const addToast = useToastStore(state => state.addToast);
  const { confirm: confirmAction } = useConfirmStore();

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
    const ok = await confirmAction({
      title: 'Eliminar Documento',
      message: `¿Estás seguro de que quieres eliminar "${titulo}"?`,
      variant: 'danger',
      requireValidation: true
    });
    if (!ok) return;
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

  return (    <div className="space-y-12">
      <div className="flex flex-col md:flex-row gap-8 justify-between items-start md:items-center bg-[#0A0A0A]/40 p-10 xl:p-12 border border-oro/5 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-oro/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        
        <div className="flex gap-4 p-2 bg-black/40 border border-oro/10 ninja-box">
          {['active', 'inactive'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-10 py-4 font-black uppercase tracking-[0.2em] transition-all text-[10px] xl:text-xs ${
                activeTab === tab 
                ? 'bg-oro text-rojo-sangre shadow-lg' 
                : 'text-oro/40 hover:text-oro hover:bg-oro/5'
              }`}
              style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
            >
              {tab === 'active' ? 'ACTIVOS' : 'ARCHIVADOS'} 
              <span className={`ml-3 opacity-40 ${activeTab === tab ? 'text-rojo-sangre/60' : ''}`}>({initialDocs.filter(d => tab === 'active' ? d.activo : !d.activo).length})</span>
            </button>
          ))}
        </div>

        <div className="flex w-full md:w-auto gap-6 items-center">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-oro/40" />
            <input 
              type="text" 
              placeholder="BUSCAR EXPEDIENTE..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/20 border border-oro/10 py-4 pl-14 pr-8 text-[10px] xl:text-xs font-black text-oro focus:border-oro/40 outline-none transition-all placeholder:text-oro/20 uppercase tracking-widest"
              style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
            />
          </div>
          
          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-black/20 border border-oro/10 px-8 py-4 text-[10px] xl:text-xs font-black text-oro outline-none focus:border-oro/40 transition-all appearance-none pr-14 cursor-pointer uppercase tracking-widest"
            style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
          >
            <option value="all">TODAS LAS CATEGORÍAS</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.slug}>{cat.nombre.toUpperCase()}</option>
            ))}
          </select>

          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-4 px-10 py-4 bg-rojo-sangre hover:brightness-125 text-oro font-black text-[10px] xl:text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-rojo-sangre/20 active:scale-95"
            style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
          >
            <PlusCircle className="w-5 h-5" />
            CREAR NUEVO
          </button>
        </div>
      </div>

      <div className="bg-[#0A0A0A]/40 border border-oro/5 overflow-hidden backdrop-blur-md">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-black/20 border-b border-oro/5">
              <th className="p-10 text-[10px] xl:text-xs font-black uppercase tracking-[0.4em] text-oro/40">IDENTIFICADOR Y TÍTULO</th>
              <th className="p-10 text-[10px] xl:text-xs font-black uppercase tracking-[0.4em] text-oro/40 text-center">CLASIFICACIÓN</th>
              <th className="p-10 text-[10px] xl:text-xs font-black uppercase tracking-[0.4em] text-oro/40 text-right">PROTOCOLOS DE MANDO</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-oro/5">
            {filteredDocs.map((doc) => (
              <tr key={doc.id} className="hover:bg-oro/5 transition-all group">
                <td className="p-10">
                  <div className="flex items-center gap-8">
                    <div className="w-20 h-20 bg-black/40 border border-oro/10 flex items-center justify-center overflow-hidden" style={{ clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)' }}>
                      {doc.url_imagen ? (
                        <img src={doc.url_imagen} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                      ) : (
                        <FileText className="w-8 h-8 text-oro/20 group-hover:text-oro transition-colors" />
                      )}
                    </div>
                    <div>
                      <p className="text-xl xl:text-2xl font-black text-oro uppercase tracking-tight group-hover:text-oro transition-colors italic leading-none">{doc.titulo}</p>
                      <div className="flex items-center gap-3 mt-3">
                         <div className="w-1 h-1 bg-rojo-sangre rotate-45" />
                         <p className="text-[10px] text-oro/30 font-black uppercase tracking-[0.2em]">CÓDICE: {doc.clave}</p>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-10">
                  <div className="flex flex-col items-center gap-4">
                    <span className="px-6 py-2 bg-oro/5 border border-oro/10 text-[10px] font-black uppercase tracking-[0.2em] text-oro/60" style={{ clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)' }}>
                      {doc.categoria}
                    </span>
                    {showSubcategory && doc.subcategoria && (
                      <span className="text-[8px] text-oro font-black uppercase tracking-[0.3em] bg-oro/10 px-4 py-1.5 border border-oro/20" style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}>
                        {doc.subcategoria}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-10 text-right">
                  <div className="flex justify-end gap-4">
                    <button 
                      onClick={() => toggleStatus(doc.id, doc.activo)}
                      disabled={loadingId === doc.id}
                      className={`p-4 transition-all border ${doc.activo ? 'bg-oro/10 border-oro/20 text-oro hover:bg-oro hover:text-rojo-sangre' : 'bg-black/40 border-oro/5 text-oro/20 hover:border-oro/40 hover:text-oro'}`}
                      style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
                    >
                      {loadingId === doc.id ? <RefreshCw className="w-5 h-5 animate-spin" /> : (doc.activo ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />)}
                    </button>
                    
                    <button 
                      onClick={() => setEditingDoc(doc)}
                      className="p-4 bg-oro text-rojo-sangre hover:brightness-110 transition-all active:scale-95 shadow-lg shadow-oro/10"
                      style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>

                    <button 
                      onClick={() => handleDelete(doc.id, doc.titulo)}
                      className="p-4 bg-rojo-sangre/10 border border-rojo-sangre/20 text-rojo-sangre hover:bg-rojo-sangre hover:text-oro transition-all active:scale-95"
                      style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredDocs.length === 0 && (
              <tr>
                <td colSpan={3} className="p-40 text-center">
                   <p className="text-oro/10 font-black uppercase tracking-[0.5em] text-sm italic">SISTEMA SIN REGISTROS COMPATIBLES</p>
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
