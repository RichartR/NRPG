'use client';

import { useState, useMemo } from 'react';
import { Plus, Eye, EyeOff, Shield, Search, Edit2, Save, X, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AdminService } from '@/services/supabase/admin.service';
import { useToastStore } from '@/components/ui/Toast';
import { DataField, SelectField, SearchableSelect } from '@/components/ui/Fields';
import { SubEspecialidad, RamaClan } from '@/domain/types';

export default function SubEspecialidadList({ initialSubs, ramas }: { initialSubs: SubEspecialidad[], ramas: RamaClan[] }) {
  const [subs, setSubs] = useState<SubEspecialidad[]>(initialSubs);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<SubEspecialidad> | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newSub, setNewSub] = useState<Partial<SubEspecialidad>>({ 
    nombre: '', 
    slug: '', 
    rama_id: undefined, 
    descripcion: '',
    url_imagen: '',
    activo: true 
  });
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const addToast = useToastStore(state => state.addToast);

  const handleAdd = async () => {
    if (!newSub.nombre || !newSub.rama_id) return;
    setLoading(true);

    try {
      const payload = {
        ...newSub,
        slug: newSub.slug || newSub.nombre.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
      };

      const data = await AdminService.saveSubEspecialidad(payload);
      setSubs([data as SubEspecialidad, ...subs]);
      setNewSub({ nombre: '', slug: '', rama_id: undefined, descripcion: '', url_imagen: '', activo: true });
      setIsAdding(false);
      addToast("Sub-especialidad creada con éxito", "success");
      router.refresh();
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editForm) return;
    setLoading(true);

    try {
      const payload = {
        ...editForm,
        slug: editForm.slug || editForm.nombre?.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
      };

      const data = await AdminService.saveSubEspecialidad(payload);
      setSubs(subs.map(s => s.id === (data as SubEspecialidad).id ? (data as SubEspecialidad) : s));
      setEditingId(null);
      setEditForm(null);
      addToast("Sub-especialidad actualizada", "success");
      router.refresh();
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id: number, currentStatus: boolean) => {
    try {
      await AdminService.saveSubEspecialidad({ id, activo: !currentStatus });
      setSubs(subs.map(s => s.id === id ? { ...s, activo: !currentStatus } : s));
      addToast(`Registro ${!currentStatus ? 'activado' : 'archivado'}`, "success");
      router.refresh();
    } catch (err: any) {
      addToast(err.message, "error");
    }
  };

  const filteredSubs = useMemo(() => {
    return subs.filter(sub => {
      const matchesTab = activeTab === 'active' ? sub.activo : !sub.activo;
      const matchesSearch = (sub.nombre || '').toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [subs, activeTab, search]);

  return (
    <div className="mt-24 space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-zinc-900/30 p-8 rounded-[3rem] border border-zinc-800/50 backdrop-blur-md">
        <div>
           <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter flex items-center gap-4">
            <Shield className="w-8 h-8 text-blue-500" />
            Sub-Categorías Técnicas
          </h2>
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-2 ml-12">Desglose de especialidades por rama</p>
        </div>
        
        <div className="flex gap-4">
          <div className="relative md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input 
              type="text" 
              placeholder="BUSCAR SUB-CATEGORÍA..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-2xl py-4 pl-12 pr-6 text-xs font-bold text-white focus:border-blue-500 outline-none transition-all placeholder:text-zinc-700"
            />
          </div>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 border ${
              isAdding ? 'bg-zinc-900 text-zinc-400 border-zinc-800' : 'bg-blue-600 text-black border-blue-600 shadow-xl shadow-blue-500/10'
            }`}
          >
            {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isAdding ? 'CANCELAR' : 'NUEVA'}
          </button>
        </div>
      </div>

      <div className="flex gap-3 p-1.5 bg-zinc-950 border border-zinc-900 rounded-[1.5rem] w-fit">
        {['active', 'inactive'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
              activeTab === tab 
              ? 'bg-blue-600 text-black shadow-xl shadow-blue-500/20' 
              : 'text-zinc-500 hover:text-white'
            }`}
          >
            {tab === 'active' ? 'Activos' : 'Archivados'} 
            <span className="ml-2 opacity-40">({subs.filter(s => tab === 'active' ? s.activo : !s.activo).length})</span>
          </button>
        ))}
      </div>

      {/* Formulario de Creación */}
      {isAdding && (
        <div className="bg-zinc-950 border border-blue-500/20 rounded-[3rem] p-10 animate-in slide-in-from-top-4 duration-300 space-y-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <DataField 
              label="Nombre" 
              value={newSub.nombre || ''} 
              onChange={v => {
                setNewSub({ ...newSub, nombre: v, slug: v.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '') });
              }} 
            />
            <DataField label="Slug (URL)" value={newSub.slug || ''} onChange={v => setNewSub({ ...newSub, slug: v.toLowerCase().replace(/\s+/g, '-') })} />
            <SearchableSelect 
              label="Rama / Clan Padre" 
              value={newSub.rama_id} 
              options={ramas.map(r => ({ label: r.nombre, value: r.id }))} 
              onChange={v => setNewSub({ ...newSub, rama_id: Number(v) })} 
            />
            <DataField 
              label="URL Imagen" 
              value={newSub.url_imagen || ''} 
              onChange={v => setNewSub({ ...newSub, url_imagen: v })} 
              placeholder="https://ejemplo.com/imagen.jpg"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Descripción / Lore</label>
            <textarea 
              rows={4}
              value={newSub.descripcion || ''} 
              onChange={e => setNewSub({ ...newSub, descripcion: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-white font-bold outline-none focus:border-blue-500 transition-all placeholder:text-zinc-700"
              placeholder="Explica de qué trata esta sub-categoría..."
            />
          </div>

          <div className="flex justify-end pt-6 border-t border-zinc-900">
            <button 
              onClick={handleAdd}
              disabled={loading || !newSub.nombre || !newSub.rama_id}
              className="bg-blue-600 text-black px-12 py-4 rounded-full font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Crear Sub-Categoría
            </button>
          </div>
        </div>
      )}

      {/* Listado */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSubs.map(sub => (
          <div 
            key={sub.id} 
            className={`group p-8 bg-zinc-950 border transition-all rounded-[2.5rem] flex flex-col justify-between relative overflow-hidden ${
              editingId === sub.id ? 'border-blue-500 ring-4 ring-blue-500/5' : 'border-zinc-900 hover:border-blue-500/30'
            }`}
          >
            {editingId === sub.id && editForm ? (
              <div className="space-y-6">
                <DataField label="Nombre" value={editForm.nombre || ''} onChange={v => setEditForm({ ...editForm, nombre: v })} />
                <SearchableSelect label="Rama" value={editForm.rama_id} options={ramas.map(r => ({ label: r.nombre, value: r.id }))} onChange={v => setEditForm({ ...editForm, rama_id: Number(v) })} />
                <DataField label="URL Imagen" value={editForm.url_imagen || ''} onChange={v => setEditForm({ ...editForm, url_imagen: v })} placeholder="https://ejemplo.com/imagen.jpg" />
                <textarea 
                  value={editForm.descripcion || ''} 
                  onChange={e => setEditForm({ ...editForm, descripcion: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white text-xs outline-none focus:border-blue-500"
                  rows={3}
                  placeholder="Descripción / Lore"
                />
                <div className="flex justify-end gap-4 pt-4">
                  <button onClick={() => setEditingId(null)} className="text-zinc-600 font-black uppercase text-[10px] tracking-widest px-4">Cancelar</button>
                  <button onClick={handleUpdate} className="bg-white text-black px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95">Guardar</button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center group-hover:border-blue-500/50 transition-all">
                      {sub.url_imagen ? (
                        <img src={sub.url_imagen} alt={sub.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <Shield className="w-6 h-6 text-zinc-700 group-hover:text-blue-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => toggleActive(sub.id, sub.activo)}
                        className={`p-3 rounded-xl transition-all ${sub.activo ? 'text-blue-500 bg-blue-500/5 border border-blue-500/20 hover:bg-blue-600 hover:text-white' : 'text-zinc-700 bg-zinc-900 border border-zinc-800 hover:text-white'}`}
                      >
                        {sub.activo ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                      </button>
                      <button 
                        onClick={() => { setEditingId(sub.id); setEditForm({ ...sub }); }}
                        className="p-3 bg-white text-black rounded-xl hover:bg-zinc-200 transition-all active:scale-95 shadow-lg shadow-white/5"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-1">{sub.nombre}</h3>
                  <p className="text-zinc-500 text-xs italic mb-8 leading-relaxed line-clamp-3">
                    {sub.descripcion || 'Sin descripción técnica disponible.'}
                  </p>
                </div>
                
                <div className="flex items-center justify-between pt-6 border-t border-zinc-900">
                  <span className="text-[9px] font-black text-zinc-700 font-mono italic">/{sub.slug}</span>
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-900 px-4 py-1.5 rounded-full border border-zinc-800">
                    {ramas.find(r => r.id === sub.rama_id)?.nombre || 'General'}
                  </span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
