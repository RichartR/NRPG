'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, Save, Search, Filter, 
  Layers, Tag, Box, Check, X, ChevronLeft, ArrowRight, Archive, Eye,
  User, Swords, ScrollText, Trophy, Star, ChevronDown
} from 'lucide-react';
import { AdminService } from '@/services/supabase/admin.service';
import { 
  GlosarioCategoria, 
  GlosarioSubcategoria, 
  Glosario,
  RamaClan
} from '@/domain/types';
import { useToastStore } from '@/components/ui/Toast';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';
import { createClient } from '@/utils/supabase/client';
import { MasterServerService } from '@/services/supabase/master.server.service';

type Section = 'hub' | 'elementos' | 'categorias' | 'subcategorias';
type ViewStatus = 'active' | 'archived';

const RANGOS = ['D', 'C', 'B', 'A', 'S'];
const STATS_LIST = [
  { key: 'fue', label: 'FUE' },
  { key: 'agi', label: 'AGI' },
  { key: 'int', label: 'INT' },
  { key: 'est', label: 'EST' },
  { key: 'nin', label: 'NIN' },
  { key: 'gen', label: 'GEN' },
  { key: 'tai', label: 'TAI' },
  { key: 'sm', label: 'SM' }
];

const toSlug = (text: string) => {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, '-');
};

export default function GlosarioManager() {
  const [activeSection, setActiveSection] = useState<Section>('hub');
  const [viewStatus, setViewStatus] = useState<ViewStatus>('active');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [categorias, setCategorias] = useState<GlosarioCategoria[]>([]);
  const [subcategorias, setSubcategorias] = useState<GlosarioSubcategoria[]>([]);
  const [elementos, setElementos] = useState<Glosario[]>([]);
  const [ramas, setRamas] = useState<RamaClan[]>([]);
  const [personajes, setPersonajes] = useState<any[]>([]);
  
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingCat, setEditingCat] = useState<GlosarioCategoria | null>(null);
  const [editingSub, setEditingSub] = useState<GlosarioSubcategoria | null>(null);
  
  const addToast = useToastStore(state => state.addToast);
  const { confirm: confirmAction } = useConfirmStore();
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cats, subs, els, rms] = await Promise.all([
        MasterServerService.getGlosarioCategorias(supabase),
        MasterServerService.getGlosarioSubcategorias(supabase),
        MasterServerService.getGlosarios(supabase),
        MasterServerService.getAdminRamasActivas(supabase)
      ]);
      const { data: pjs } = await supabase.from('reg_characters').select('id, nombre_ninja').eq('activo', true).order('nombre_ninja');

      setCategorias(cats);
      setSubcategorias(subs);
      setElementos(els);
      setRamas(rms);
      setPersonajes(pjs || []);
    } catch (error) {
      console.error(error);
      addToast('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveElemento = async (el: Partial<Glosario>) => {
    setSaving(true);
    try {
      await AdminService.saveGlosario(el);
      addToast('Glosario actualizado', 'success');
      setEditingId(null);
      setShowNewForm(false);
      fetchData();
    } catch (error) {
      addToast('Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredData = () => {
    const isActivo = viewStatus === 'active';
    const text = search.toLowerCase();
    if (activeSection === 'elementos') {
      return elementos.filter(el => el.activo === isActivo && (el.nombre_es.toLowerCase().includes(text) || el.nombre_jp?.toLowerCase().includes(text)) && (filterCat ? el.categoria_id === filterCat : true));
    }
    if (activeSection === 'categorias') {
      return categorias.filter(c => c.activo === isActivo && c.nombre.toLowerCase().includes(text));
    }
    if (activeSection === 'subcategorias') {
      return subcategorias.filter(s => s.activo === isActivo && s.nombre.toLowerCase().includes(text));
    }
    return [];
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Sincronizando Glosario...</span>
      </div>
    );
  }

  if (activeSection === 'hub') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <HubCard title="Glosario" desc="Administra todos los elementos, técnicas y objetos." icon={<Box size={32} />} count={elementos.filter(e => e.activo).length} onClick={() => { setActiveSection('elementos'); setSearch(''); setViewStatus('active'); }} color="emerald" />
        <HubCard title="Categorías" desc="Gestiona las categorías principales del sistema." icon={<Tag size={32} />} count={categorias.filter(c => c.activo).length} onClick={() => { setActiveSection('categorias'); setSearch(''); setViewStatus('active'); }} color="blue" />
        <HubCard title="Subcategorías" desc="Vincula subcategorías a las ramas principales." icon={<Layers size={32} />} count={subcategorias.filter(s => s.activo).length} onClick={() => { setActiveSection('subcategorias'); setSearch(''); setViewStatus('active'); }} color="amber" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <button onClick={() => setActiveSection('hub')} className="flex items-center gap-3 text-zinc-500 hover:text-white transition-colors group w-fit">
            <div className="p-2 bg-zinc-900 rounded-xl group-hover:bg-zinc-800 transition-colors"><ChevronLeft size={16} /></div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Volver al Panel</span>
          </button>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Gestión de <span className="text-emerald-500">{activeSection.toUpperCase()}</span></h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-800/50">
            <button onClick={() => setViewStatus('active')} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${viewStatus === 'active' ? 'bg-emerald-500 text-emerald-950 shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}><Eye size={14} /> Activas</button>
            <button onClick={() => setViewStatus('archived')} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${viewStatus === 'archived' ? 'bg-zinc-700 text-zinc-300 shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}><Archive size={14} /> Archivadas</button>
          </div>
          <button onClick={() => setShowNewForm(true)} className="flex items-center gap-2 bg-white hover:bg-emerald-500 text-black px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-white/5"><Plus size={16} strokeWidth={3} /> Nuevo Registro</button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" size={18} />
          <input type="text" placeholder={`Buscar en ${activeSection}...`} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-white font-bold text-sm outline-none focus:border-emerald-500/50 transition-all" />
        </div>
        {activeSection === 'elementos' && (
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-2">
            <Filter size={16} className="text-zinc-600" />
            <select value={filterCat || ''} onChange={(e) => setFilterCat(e.target.value ? Number(e.target.value) : null)} className="bg-transparent text-zinc-400 font-bold text-xs outline-none cursor-pointer">
              <option value="">Todas las Categorías</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="grid gap-4">
         {activeSection === 'elementos' ? (
          filteredData().map((el: any) => (
            <ElementoCard 
              key={el.id} 
              elemento={el} 
              categorias={categorias} 
              subcategorias={subcategorias} 
              onEdit={() => setEditingId(el.id)} 
              onDelete={async () => {
                const ok = await confirmAction({
                  title: 'Eliminar Elemento',
                  message: '¿Estás seguro de que deseas eliminar este elemento permanentemente?',
                  variant: 'danger',
                  requireValidation: true
                });
                if (ok) AdminService.deleteGlosario(el.id).then(fetchData);
              }} 
            />
          ))
        ) : activeSection === 'categorias' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredData().map((c: any) => (
              <div key={c.id} className="group p-8 bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] hover:bg-zinc-900/50 transition-all">
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-3 rounded-xl ${c.activo ? 'bg-blue-500/10 text-blue-500' : 'bg-zinc-800 text-zinc-500'}`}><Tag size={20} /></div>
                   <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingCat(c); setShowNewForm(true); }} className="p-2 text-zinc-500 hover:text-white transition-colors"><Save size={18}/></button>
                    <button onClick={async () => {
                      const ok = await confirmAction({
                        title: 'Eliminar Categoría',
                        message: '¿Borrar esta categoría? Podría haber elementos que dependan de ella.',
                        variant: 'danger',
                        requireValidation: true
                      });
                      if (ok) AdminService.deleteGlosarioCategoria(c.id).then(fetchData);
                    }} className="p-2 text-zinc-500 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                  </div>
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">{c.nombre}</h3>
                <div className="flex items-center gap-3"><code className="text-[10px] font-mono text-zinc-600 bg-black/40 px-2 py-1 rounded">/{c.slug}</code>{!c.activo && <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest border border-zinc-800 px-2 py-0.5 rounded-full">Archivado</span>}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredData().map((s: any) => (
              <div key={s.id} className="group p-8 bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] hover:bg-zinc-900/50 transition-all">
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-3 rounded-xl ${s.activo ? 'bg-amber-500/10 text-amber-500' : 'bg-zinc-800 text-zinc-500'}`}><Layers size={20} /></div>
                   <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingSub(s); setShowNewForm(true); }} className="p-2 text-zinc-500 hover:text-white transition-colors"><Save size={18}/></button>
                    <button onClick={async () => {
                      const ok = await confirmAction({
                        title: 'Eliminar Subcategoría',
                        message: '¿Borrar esta subcategoría? Podría haber elementos vinculados.',
                        variant: 'danger',
                        requireValidation: true
                      });
                      if (ok) AdminService.deleteGlosarioSubcategoria(s.id).then(fetchData);
                    }} className="p-2 text-zinc-500 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                  </div>
                </div>
                <div className="space-y-1 mb-4"><span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{categorias.find(c => c.id === s.categoria_id)?.nombre || 'Sin Padre'}</span><h3 className="text-xl font-black text-white uppercase tracking-tight">{s.nombre}</h3></div>
                <div className="flex items-center gap-3"><code className="text-[10px] font-mono text-zinc-600 bg-black/40 px-2 py-1 rounded">/{s.slug}</code>{!s.activo && <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest border border-zinc-800 px-2 py-0.5 rounded-full">Archivado</span>}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(showNewForm || editingId) && activeSection === 'elementos' && (
        <ElementoForm initialData={elementos.find(e => e.id === editingId)} categorias={categorias} subcategorias={subcategorias} ramas={ramas} personajes={personajes} onClose={() => { setShowNewForm(false); setEditingId(null); }} onSave={handleSaveElemento} loading={saving} />
      )}

      {(showNewForm || editingCat) && activeSection === 'categorias' && (
        <GenericForm title={editingCat ? 'Editar Categoría' : 'Nueva Categoría'} initialData={editingCat || { nombre: '', slug: '', activo: true }} fields={[{ name: 'nombre', label: 'Nombre' }, { name: 'slug', label: 'Slug' }, { name: 'activo', label: 'Estado', type: 'toggle' }]} onClose={() => { setShowNewForm(false); setEditingCat(null); }} onSave={(cat:any) => AdminService.saveGlosarioCategoria(cat).then(fetchData).finally(() => {setShowNewForm(false); setEditingCat(null);})} loading={saving} />
      )}

      {(showNewForm || editingSub) && activeSection === 'subcategorias' && (
        <GenericForm title={editingSub ? 'Editar Subcategoría' : 'Nueva Subcategoría'} initialData={editingSub || { nombre: '', slug: '', categoria_id: 0, activo: true }} fields={[{ name: 'nombre', label: 'Nombre' }, { name: 'slug', label: 'Slug' }, { name: 'categoria_id', label: 'Categoría Padre', type: 'select', options: categorias }, { name: 'activo', label: 'Estado', type: 'toggle' }]} onClose={() => { setShowNewForm(false); setEditingSub(null); }} onSave={(sub:any) => AdminService.saveGlosarioSubcategoria(sub).then(fetchData).finally(() => {setShowNewForm(false); setEditingSub(null);})} loading={saving} />
      )}
    </div>
  );
}

function HubCard({ title, desc, icon, count, onClick, color }: any) {
  const colors: any = {
    emerald: 'text-emerald-500 bg-emerald-500/10 hover:border-emerald-500/40',
    blue: 'text-blue-500 bg-blue-500/10 hover:border-blue-500/40',
    amber: 'text-amber-500 bg-amber-500/10 hover:border-amber-500/40'
  };
  return (
    <button onClick={onClick} className={`group relative p-12 bg-zinc-900 border border-zinc-800 rounded-[3rem] text-left transition-all hover:scale-[1.02] active:scale-95 ${colors[color]}`}>
      <div className="mb-8 p-6 rounded-2xl bg-black/40 w-fit group-hover:scale-110 transition-transform">{icon}</div>
      <div className="space-y-3 mb-10"><h3 className="text-3xl font-black text-white uppercase tracking-tight">{title}</h3><p className="text-zinc-500 text-sm leading-relaxed">{desc}</p></div>
      <div className="flex items-center justify-between"><div className="flex items-center gap-3 bg-black/40 px-5 py-2.5 rounded-xl border border-white/5"><span className="text-white font-black text-lg leading-none">{count}</span><span className="text-zinc-600 font-black text-[10px] uppercase tracking-widest">Activos</span></div><div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all"><ArrowRight size={20} /></div></div>
    </button>
  );
}

function ElementoCard({ elemento, categorias, subcategorias, onEdit, onDelete }: any) {
  const cat = categorias.find((c:any) => c.id === elemento.categoria_id);
  const sub = subcategorias.find((s:any) => s.id === elemento.subcategoria_id);
  return (
    <div className={`group border rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center gap-8 transition-all ${elemento.activo ? 'bg-zinc-900/30 border-zinc-800/50 hover:border-emerald-500/30 hover:bg-zinc-900/50' : 'bg-zinc-950 border-zinc-900/50 opacity-60'}`}>
      <div className="flex flex-col items-center gap-2"><div className={`w-3 h-3 rounded-full ${elemento.activo ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-zinc-800'}`} /><span className="text-zinc-800 font-black text-[10px] uppercase">ID: {elemento.id}</span></div>
      <div className="flex-1 text-center md:text-left space-y-1">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
          <span className="bg-zinc-800 text-zinc-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter">{cat?.nombre || 'Sin Cat'}</span>
          {sub && <span className="bg-emerald-500/10 text-emerald-500/70 border border-emerald-500/10 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter">{sub.nombre}</span>}
          {elemento.inicial && <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter flex items-center gap-1"><Star size={10} className="fill-amber-500" /> Inicial</span>}
        </div>
        <h3 className="text-white font-black text-xl uppercase tracking-tight group-hover:text-emerald-400 transition-colors">{elemento.nombre_es}</h3><p className="text-zinc-600 font-medium italic text-sm">{elemento.nombre_jp || '-'}</p>
      </div>
      <div className="flex gap-4">
        <div className="bg-zinc-950/50 px-6 py-4 rounded-[1.5rem] border border-zinc-900 text-center min-w-[100px]"><p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest mb-1">Coste EXP</p><p className="text-emerald-500 font-black text-lg">{elemento.coste_exp}</p></div>
        <div className="bg-zinc-950/50 px-6 py-4 rounded-[1.5rem] border border-zinc-900 text-center min-w-[100px]"><p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest mb-1">Coste Ryo</p><p className="text-amber-500 font-black text-lg">{elemento.coste_ryous}</p></div>
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
        <button onClick={onEdit} className="p-4 bg-zinc-800 hover:bg-emerald-500 hover:text-emerald-950 rounded-2xl transition-all">
          <Save size={18} />
        </button>
        <button onClick={onDelete} className="p-4 bg-zinc-800 hover:bg-red-500/20 hover:text-red-500 rounded-2xl transition-all">
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}

function ElementoForm({ initialData, categorias, subcategorias, ramas, personajes, onClose, onSave, loading }: any) {
  const defaultRequisitos = {
    stats: { fue: 0, agi: 0, int: 0, est: 0, nin: 0, gen: 0, tai: 0, sm: 0 },
    rango: null,
    misiones: { D: 0, C: 0, B: 0, A: 0, S: 0 },
    combates: 0,
    rama_id: null,
    personaje_id: null
  };

  const [formData, setFormData] = useState<Partial<Glosario>>(() => {
    if (!initialData) {
      return {
        nombre_es: '', 
        nombre_jp: '', 
        categoria_id: 0, 
        subcategoria_id: undefined,
        coste_exp: 0, 
        coste_ryous: 0, 
        activo: true, 
        inicial: false,
        requisitos: defaultRequisitos
      };
    }
    return {
      ...initialData,
      coste_ryous: initialData.coste_ryous || 0,
      inicial: initialData.inicial || false,
      requisitos: { ...defaultRequisitos, ...initialData.requisitos }
    };
  });

  const filteredSubs = subcategorias.filter((s: any) => s.categoria_id === formData.categoria_id);

  const updateReq = (key: string, value: any) => {
    const newReqs = { ...formData.requisitos };
    const val = typeof value === 'number' ? Math.max(0, value) : value;
    if (val === null || val === '') {
      delete newReqs[key];
    } else {
      newReqs[key] = val;
    }
    setFormData({ ...formData, requisitos: newReqs });
  };

  const updateNestedReq = (parentKey: string, childKey: string, value: any) => {
    const newReqs = { ...formData.requisitos };
    const parent = { ...(newReqs[parentKey] || {}) };
    const val = Math.max(0, Number(value));
    
    parent[childKey] = val;
    newReqs[parentKey] = parent;
    
    setFormData({ ...formData, requisitos: newReqs });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-950 border border-zinc-800 w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-[3.5rem] shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-12 space-y-12">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-8">
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter">{initialData ? 'Editar Registro' : 'Nuevo Registro'}</h2>
            <button onClick={onClose} className="p-4 bg-zinc-900 hover:bg-white hover:text-black rounded-2xl transition-all"><X size={24} /></button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div className="space-y-8">
              <div className="bg-zinc-900/50 p-8 rounded-[2.5rem] border border-zinc-900 space-y-6">
                <h3 className="flex items-center gap-3 text-sm font-black text-zinc-500 uppercase tracking-widest mb-4"><Box size={16}/> Información Base</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Nombre Español</label>
                    <input type="text" value={formData.nombre_es} onChange={(e) => setFormData({ ...formData, nombre_es: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-emerald-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Nombre Japonés</label>
                    <input type="text" value={formData.nombre_jp || ''} onChange={(e) => setFormData({ ...formData, nombre_jp: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-emerald-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Categoría</label>
                      <select value={formData.categoria_id} onChange={(e) => setFormData({ ...formData, categoria_id: Number(e.target.value), subcategoria_id: undefined })} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white font-bold outline-none appearance-none cursor-pointer">
                        <option value={0}>Seleccionar...</option>
                        {categorias.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Subcategoría</label>
                      <select value={formData.subcategoria_id || ''} onChange={(e) => setFormData({ ...formData, subcategoria_id: e.target.value ? Number(e.target.value) : undefined })} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white font-bold outline-none appearance-none cursor-pointer">
                        <option value="">Ninguna</option>
                        {filteredSubs.map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/50 p-8 rounded-[2.5rem] border border-zinc-900 space-y-6">
                <h3 className="flex items-center gap-3 text-sm font-black text-zinc-500 uppercase tracking-widest mb-4"><Star size={16}/> Costes y Estado</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Coste EXP</label>
                    <input type="number" min="0" value={formData.coste_exp} onChange={(e) => setFormData({ ...formData, coste_exp: Math.max(0, Number(e.target.value)) })} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-emerald-500" />
                  </div>
                   <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Coste Ryo</label>
                    <input type="number" min="0" value={formData.coste_ryous} onChange={(e) => setFormData({ ...formData, coste_ryous: Math.max(0, Number(e.target.value)) })} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-emerald-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setFormData({ ...formData, activo: !formData.activo })} className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all ${formData.activo ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-lg' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>
                    <span className="font-black text-xs uppercase tracking-widest ml-2">{formData.activo ? 'Activo' : 'Archivado'}</span>
                    {formData.activo ? <Check size={20} /> : <Archive size={20} />}
                  </button>
                  <button onClick={() => setFormData({ ...formData, inicial: !formData.inicial })} className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all ${formData.inicial ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-lg' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>
                    <span className="font-black text-xs uppercase tracking-widest ml-2">{formData.inicial ? 'Inicial (Nuevo PJ)' : 'No Inicial'}</span>
                    {formData.inicial ? <Star size={20} className="fill-amber-500" /> : <Plus size={20} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-zinc-900/30 p-10 rounded-[3rem] border border-zinc-800/50 space-y-10">
                <div className="flex items-center justify-between"><h3 className="flex items-center gap-3 text-lg font-black text-white uppercase tracking-tighter"><ScrollText size={20} className="text-emerald-500"/> Requisitos del Sistema</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1"><Swords size={12}/> Atributos Necesarios</label>
                    <div className="grid grid-cols-1 gap-2">
                      {STATS_LIST.map(s => (
                        <div key={s.key} className="flex items-center justify-between bg-zinc-950/50 p-2 pl-4 rounded-xl border border-zinc-900/50 group hover:border-zinc-700 transition-all">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{s.label}</span>
                          <input type="number" min="0" value={formData.requisitos?.stats?.[s.key] ?? ''} placeholder="0" onChange={(e) => updateNestedReq('stats', s.key, e.target.value)} className="w-16 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-center text-emerald-500 font-black text-xs outline-none focus:border-emerald-500 transition-all" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1"><Star size={12}/> Rango Mínimo</label>
                      <div className="flex gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-900">
                        {RANGOS.map(r => (
                          <button key={r} onClick={() => updateReq('rango', formData.requisitos?.rango === r ? null : r)} className={`flex-1 py-3 rounded-lg font-black text-xs transition-all ${formData.requisitos?.rango === r ? 'bg-emerald-500 text-emerald-950' : 'text-zinc-600 hover:bg-zinc-900'}`}>{r}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1"><Trophy size={12}/> Misiones por Rango</label>
                      <div className="grid grid-cols-5 gap-2">
                        {RANGOS.map(r => (
                          <div key={`mis-${r}`} className="space-y-1">
                            <span className="block text-center text-[9px] font-black text-zinc-700">{r}</span>
                            <input type="number" min="0" value={formData.requisitos?.misiones?.[r] ?? 0} onChange={(e) => updateNestedReq('misiones', r, e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 text-center text-amber-500 font-black text-xs outline-none focus:border-amber-500 transition-all" />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1"><Swords size={12}/> Combates Ganados</label>
                      <input type="number" min="0" value={formData.requisitos?.combates ?? 0} onChange={(e) => updateReq('combates', Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-emerald-500" placeholder="0" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-900">
                  <SearchableSelect 
                    label="Rama / Clan" 
                    icon={<Layers size={12}/>} 
                    options={(ramas || []).map((r: any) => ({ id: r.id, label: r.nombre }))} 
                    value={formData.requisitos?.rama_id} 
                    onChange={(id: any) => updateReq('rama_id', id)} 
                  />
                  <SearchableSelect 
                    label="Exclusivo para" 
                    icon={<User size={12}/>} 
                    options={(personajes || []).map((p: any) => ({ id: p.id, label: p.nombre_ninja }))} 
                    value={formData.requisitos?.personaje_id} 
                    onChange={(id: any) => updateReq('personaje_id', id)} 
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-4"><button onClick={() => onSave(formData)} disabled={loading} className="group relative bg-white text-black px-16 py-6 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.3em] hover:bg-emerald-400 transition-all flex items-center gap-4 overflow-hidden shadow-2xl shadow-white/5 active:scale-95"><div className="absolute inset-0 bg-emerald-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300" /><div className="relative z-10 flex items-center gap-4"><Save size={20} /> Finalizar y Guardar</div></button></div>
        </div>
      </div>
    </div>
  );
}

function SearchableSelect({ label, icon, options, value, onChange }: any) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o: any) => o.id === value);
  const filteredOptions = options.filter((o: any) => o.label.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative space-y-2" ref={containerRef}>
      <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">{icon} {label}</label>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white font-bold outline-none hover:border-zinc-700 transition-all">
        <span className={selectedOption ? 'text-white' : 'text-zinc-600'}>{selectedOption ? selectedOption.label : 'Seleccionar...'}</span>
        <ChevronDown size={16} className={`text-zinc-600 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-[60] bottom-full mb-2 w-full bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          <div className="p-3 border-b border-zinc-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-white text-xs font-bold outline-none focus:border-emerald-500" placeholder="Buscar..." />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            <button onClick={() => { onChange(null); setOpen(false); }} className="w-full text-left px-4 py-3 text-[10px] font-black text-zinc-500 hover:bg-white/5 uppercase tracking-widest">Ninguno / Quitar selección</button>
            {filteredOptions.map((o: any) => (
              <button key={o.id} onClick={() => { onChange(o.id); setOpen(false); }} className={`w-full text-left px-4 py-3 text-xs font-bold transition-all hover:bg-emerald-500 hover:text-emerald-950 ${o.id === value ? 'bg-emerald-500/10 text-emerald-500' : 'text-white'}`}>{o.label}</button>
            ))}
            {filteredOptions.length === 0 && <div className="px-4 py-8 text-center text-[10px] font-black text-zinc-700 uppercase">Sin resultados</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function GenericForm({ title, initialData, fields, onClose, onSave, loading }: any) {
  const [formData, setFormData] = useState(initialData);
  const handleFieldChange = (fieldName: string, value: any) => {
    const newData = { ...formData, [fieldName]: value };
    if (fieldName === 'nombre' && 'slug' in formData) newData.slug = toSlug(value);
    setFormData(newData);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-950 border border-zinc-800 w-full max-w-lg rounded-[3rem] shadow-2xl animate-in zoom-in-95">
        <div className="p-10 space-y-8">
          <div className="flex justify-between"><h2 className="text-2xl font-black text-white uppercase tracking-tighter">{title}</h2><button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors"><X size={20}/></button></div>
          <div className="space-y-5">
            {fields.map((f: any) => (
              <div key={f.name} className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">{f.label}</label>
                {f.type === 'select' ? (
                  <select value={formData[f.name]} onChange={(e) => handleFieldChange(f.name, Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-white font-bold outline-none cursor-pointer"><option value={0}>Seleccionar...</option>{f.options.map((o: any) => <option key={o.id} value={o.id}>{o.nombre}</option>)}</select>
                ) : f.type === 'toggle' ? (
                  <button onClick={() => handleFieldChange(f.name, !formData[f.name])} className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${formData[f.name] ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-lg' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}><span className="font-black text-[10px] uppercase tracking-widest ml-2">{formData[f.name] ? 'Activo' : 'Archivado'}</span>{formData[f.name] ? <Check size={18} /> : <X size={18} />}</button>
                ) : (
                  <input type="text" value={formData[f.name]} onChange={(e) => handleFieldChange(f.name, e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-emerald-500/50" />
                )}
              </div>
            ))}
          </div>
          <button onClick={() => onSave(formData)} disabled={loading} className="w-full bg-white text-black py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-emerald-400 transition-all shadow-xl">{loading ? 'Guardando...' : 'Guardar Registro'}</button>
        </div>
      </div>
    </div>
  );
}
