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
      nombre_español: newSub.nombre_español,
      slug: newSub.slug || newSub.nombre.toLowerCase().replace(/\s+/g, '-')
    };

    const { data, error } = await supabase
      .from('sub_especialidades')
      .insert([payload])
      .select();

    if (!error && data) {
      setSubs([data[0], ...subs]);
      setNewSub({ nombre: '', slug: '', rama_id: '', descripcion: '', activo: true });
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
        slug: editForm.slug || editForm.nombre.toLowerCase().replace(/\s+/g, '-'),
        rama_id: editForm.rama_id,
        descripcion: editForm.descripcion,
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
      const matchesSearch = sub.nombre.toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [subs, activeTab, search]);

  return (
    <div className="mt-20 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
          <Shield className="w-6 h-6 text-blue-500" />
          Sub-Categorías Ténicas
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
        <div className="bg-zinc-900 border border-blue-500/30 rounded-[2rem] p-8 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Nombre</label>
              <input 
                placeholder="Ej: Bujutsu" 
                value={newSub.nombre} 
                onChange={e => setNewSub({...newSub, nombre: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">En Español</label>
              <input 
                placeholder="Ej: Arte de la Guerra" 
                value={newSub.nombre_español} 
                onChange={e => setNewSub({...newSub, nombre_español: e.target.value})}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Slug (URL)</label>
              <input 
                placeholder="ej-bujutsu" 
                value={newSub.slug} 
                onChange={e => setNewSub({...newSub, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500 transition-all font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Rama / Clan Padre</label>
              <select 
                value={newSub.rama_id} 
                onChange={e => setNewSub({...newSub, rama_id: e.target.value})}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500 transition-all"
              >
                <option value="">Seleccionar...</option>
                {ramas.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button 
                onClick={handleAdd}
                disabled={loading || !newSub.nombre || !newSub.rama_id}
                className="w-full bg-blue-600 text-black font-black uppercase text-xs tracking-widest py-3 rounded-xl hover:bg-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Creando...' : <><Plus className="w-4 h-4" /> Crear Sub-Categoría</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Listado */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSubs.map(sub => (
          <div 
            key={sub.id} 
            className={`group p-6 bg-zinc-900 border transition-all rounded-3xl ${
              editingId === sub.id ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-zinc-800 hover:border-zinc-700'
            }`}
          >
            {editingId === sub.id ? (
              <div className="space-y-4">
                <input 
                  value={editForm.nombre} 
                  onChange={e => setEditForm({...editForm, nombre: e.target.value})}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-blue-500 mb-2"
                  placeholder="Nombre"
                />
                <input 
                  value={editForm.nombre_español} 
                  onChange={e => setEditForm({...editForm, nombre_español: e.target.value})}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-blue-500"
                  placeholder="Nombre en Español"
                />
                <select 
                  value={editForm.rama_id} 
                  onChange={e => setEditForm({...editForm, rama_id: e.target.value})}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-blue-500"
                >
                  {ramas.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setEditingId(null)} className="text-zinc-500 hover:text-white text-xs font-bold px-3">Cancelar</button>
                  <button onClick={handleUpdate} className="bg-blue-500 text-black px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest">Guardar</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold uppercase tracking-tight mb-1">{sub.nombre}</h3>
                  {sub.nombre_español && (
                    <p className="text-zinc-500 text-[10px] italic mb-1">({sub.nombre_español})</p>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded">
                      {ramas.find(r => r.id === sub.rama_id)?.nombre || 'Desconocida'}
                    </span>
                    <span className="text-[9px] font-bold text-zinc-600 font-mono uppercase">/{sub.slug}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleActive(sub.id, sub.activo)}
                    className={`p-2 rounded-lg transition-all ${sub.activo ? 'text-zinc-500 hover:text-blue-500 hover:bg-blue-500/10' : 'text-zinc-700 hover:text-white hover:bg-zinc-800'}`}
                  >
                    {sub.activo ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={() => {
                      setEditingId(sub.id);
                      setEditForm(sub);
                    }}
                    className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
