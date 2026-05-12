'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Plus, Eye, EyeOff, Shield, Search, Edit2, Save, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SubEspecialidadList({ initialSubs, ramas }: { initialSubs: any[], ramas: any[] }) {
  const [subs, setSubs] = useState(initialSubs);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newSub, setNewSub] = useState({ 
    nombre: '', 
    nombre_español: '',
    slug: '', 
    rama_id: '', 
    descripcion: '',
    url_imagen: '',
    activo: true 
  });
  const [loading, setLoading] = useState(false);
  
  const supabase = createClient();
  const router = useRouter();

  const handleAdd = async () => {
    if (!newSub.nombre || !newSub.rama_id) return;
    setLoading(true);

    const payload = {
      ...newSub,
      slug: newSub.slug || newSub.nombre.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
    };

    const { data, error } = await supabase
      .from('sub_especialidades')
      .insert([payload])
      .select();

    if (!error && data) {
      setSubs([data[0], ...subs]);
      setNewSub({ nombre: '', nombre_español: '', slug: '', rama_id: '', descripcion: '', url_imagen: '', activo: true });
      setIsAdding(false);
      router.refresh();
    } else if (error) {
      alert("Error: " + error.message);
    }
    setLoading(false);
  };

  const handleUpdate = async () => {
    if (!editForm) return;
    setLoading(true);

    const { error } = await supabase
      .from('sub_especialidades')
      .update({
        nombre: editForm.nombre,
        nombre_español: editForm.nombre_español,
        slug: editForm.slug || editForm.nombre.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
        rama_id: editForm.rama_id,
        descripcion: editForm.descripcion,
        url_imagen: editForm.url_imagen,
        activo: editForm.activo
      })
      .eq('id', editForm.id);

    if (!error) {
      setSubs(subs.map(s => s.id === editForm.id ? editForm : s));
      setEditingId(null);
      setEditForm(null);
      router.refresh();
    }
    setLoading(false);
  };

  const toggleActive = async (id: number, currentStatus: boolean) => {
    const { error } = await supabase
      .from('sub_especialidades')
      .update({ activo: !currentStatus })
      .eq('id', id);

    if (!error) {
      setSubs(subs.map(s => s.id === id ? { ...s, activo: !currentStatus } : s));
      router.refresh();
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
    <div className="mt-20 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
          <Shield className="w-6 h-6 text-blue-500" />
          Sub-Categorías Técnicas
        </h2>
        
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input 
              type="text" 
              placeholder="Buscar sub-categoría..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-blue-500 outline-none transition-all w-64"
            />
          </div>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-sm transition-all ${
              isAdding ? 'bg-zinc-800 text-white' : 'bg-blue-600 text-black hover:bg-blue-500'
            }`}
          >
            {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isAdding ? 'CANCELAR' : 'NUEVA'}
          </button>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('active')}
          className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'active' ? 'bg-blue-500 text-black shadow-lg shadow-blue-500/20' : 'text-zinc-500 hover:text-white'}`}
        >
          ACTIVOS ({subs.filter(s => s.activo).length})
        </button>
        <button 
          onClick={() => setActiveTab('inactive')}
          className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'inactive' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
        >
          ARCHIVADOS ({subs.filter(s => !s.activo).length})
        </button>
      </div>

      {/* Formulario de Creación */}
      {isAdding && (
        <div className="bg-zinc-900 border border-blue-500/30 rounded-[2.5rem] p-8 animate-in fade-in slide-in-from-top-4 duration-300 space-y-6 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Nombre</label>
              <input 
                placeholder="Ej: Bujutsu" 
                value={newSub.nombre || ''} 
                onChange={e => {
                  const val = e.target.value;
                  setNewSub({
                    ...newSub, 
                    nombre: val, 
                    slug: val.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
                  });
                }}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">En Español</label>
              <input 
                placeholder="Ej: Arte de la Guerra" 
                value={newSub.nombre_español || ''} 
                onChange={e => setNewSub({...newSub, nombre_español: e.target.value})}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Imagen de Portada (URL)</label>
              <input 
                placeholder="https://i.imgur.com/..." 
                value={newSub.url_imagen || ''} 
                onChange={e => setNewSub({...newSub, url_imagen: e.target.value})}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Slug (URL)</label>
              <input 
                placeholder="ej-bujutsu" 
                value={newSub.slug || ''} 
                onChange={e => setNewSub({...newSub, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 transition-all font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Rama / Clan Padre</label>
              <select 
                value={newSub.rama_id} 
                onChange={e => setNewSub({...newSub, rama_id: e.target.value})}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 transition-all appearance-none"
              >
                <option value="">Seleccionar...</option>
                {ramas.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Descripción / Lore</label>
            <textarea 
              placeholder="Explica de qué trata esta sub-categoría..." 
              value={newSub.descripcion || ''} 
              onChange={e => setNewSub({...newSub, descripcion: e.target.value})}
              rows={3}
              className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 transition-all resize-none"
            />
          </div>

          <div className="flex justify-end pt-4">
            <button 
              onClick={handleAdd}
              disabled={loading || !newSub.nombre || !newSub.rama_id}
              className="bg-blue-600 text-black font-black uppercase text-xs tracking-widest px-12 py-4 rounded-xl hover:bg-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Creando...' : <><Plus className="w-4 h-4" /> Crear Sub-Categoría</>}
            </button>
          </div>
        </div>
      )}

      {/* Listado */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSubs.map(sub => (
          <div 
            key={sub.id} 
            className={`group p-8 bg-zinc-900 border transition-all rounded-[2rem] flex flex-col justify-between ${
              editingId === sub.id ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-zinc-800 hover:border-zinc-700'
            }`}
          >
            {editingId === sub.id ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Nombre y Español</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      value={editForm.nombre || ''} 
                      onChange={e => {
                        const val = e.target.value;
                        setEditForm({
                          ...editForm, 
                          nombre: val,
                          slug: val.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
                        });
                      }}
                      className="bg-black border border-zinc-800 rounded-xl px-4 py-2 text-white text-xs outline-none focus:border-blue-500"
                      placeholder="Nombre"
                    />
                    <input 
                      value={editForm.nombre_español || ''} 
                      onChange={e => setEditForm({...editForm, nombre_español: e.target.value})}
                      className="bg-black border border-zinc-800 rounded-xl px-4 py-2 text-white text-xs outline-none focus:border-blue-500"
                      placeholder="Español"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Imagen y Rama</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      value={editForm.url_imagen || ''} 
                      onChange={e => setEditForm({...editForm, url_imagen: e.target.value})}
                      className="bg-black border border-zinc-800 rounded-xl px-4 py-2 text-white text-xs outline-none focus:border-blue-500"
                      placeholder="Imagen"
                    />
                    <select 
                      value={editForm.rama_id} 
                      onChange={e => setEditForm({...editForm, rama_id: e.target.value})}
                      className="bg-black border border-zinc-800 rounded-xl px-4 py-2 text-white text-xs outline-none focus:border-blue-500"
                    >
                      {ramas.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Descripción</label>
                  <textarea 
                    value={editForm.descripcion || ''} 
                    onChange={e => setEditForm({...editForm, descripcion: e.target.value})}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2 text-white text-xs outline-none focus:border-blue-500 resize-none"
                    rows={2}
                    placeholder="Descripción"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setEditingId(null)} className="text-zinc-500 hover:text-white text-[10px] font-black uppercase tracking-widest px-3">Cancelar</button>
                  <button onClick={handleUpdate} className="bg-blue-500 text-black px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Guardar</button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center group-hover:bg-blue-500/10 group-hover:border-blue-500/50 transition-all">
                      {sub.url_imagen ? (
                        <img src={sub.url_imagen} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Shield className="w-6 h-6 text-zinc-600 group-hover:text-blue-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => toggleActive(sub.id, sub.activo)}
                        className={`p-2 rounded-xl transition-all ${sub.activo ? 'text-zinc-500 hover:text-blue-500 hover:bg-blue-500/10' : 'text-zinc-700 hover:text-white hover:bg-zinc-800'}`}
                      >
                        {sub.activo ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                      </button>
                      <button 
                        onClick={() => {
                          setEditingId(sub.id);
                          setEditForm({ ...sub });
                        }}
                        className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-xl transition-all"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-1">{sub.nombre}</h3>
                  {sub.nombre_español && (
                    <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">{sub.nombre_español}</p>
                  )}
                  <p className="text-zinc-500 text-xs line-clamp-2 italic mb-6 leading-relaxed">
                    {sub.descripcion || 'Sin descripción técnica disponible.'}
                  </p>
                </div>
                
                <div className="flex items-center justify-between pt-6 border-t border-zinc-800/50">
                  <span className="text-[10px] font-black text-zinc-600 font-mono uppercase">/{sub.slug}</span>
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-800 px-3 py-1 rounded-lg">
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
