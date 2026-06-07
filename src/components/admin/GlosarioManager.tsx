'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Save, Search, Filter, Layers, Tag, Box, Check, X, ArrowRight, Archive, Eye, User, Swords, ScrollText, Trophy, Star, ChevronDown, Sparkles, Flame } from 'lucide-react';
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
import { MasterService } from '@/services/supabase/master.service';
import { NinjaSelect } from '@/components/ui/Fields';

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
  const [aldeas, setAldeas] = useState<any[]>([]);
  const [subespecialidades, setSubespecialidades] = useState<any[]>([]);
  const [personajes, setPersonajes] = useState<any[]>([]);
  const [elementosCatalogo, setElementosCatalogo] = useState<any[]>([]);

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
      const [cats, subs, els, rms, alds, subEsps, catalogElems] = await Promise.all([
        MasterService.getGlosarioCategorias(),
        MasterService.getGlosarioSubcategorias(),
        MasterService.getGlosarios(),
        MasterService.getAdminRamasActivas(),
        MasterService.getAldeasActivas(),
        MasterService.getSubEspecialidades(),
        MasterService.getAdminElementosActivos()
      ]);
      const { data: pjs } = await supabase.from('reg_characters').select('id, nombre_ninja').eq('activo', true).order('nombre_ninja');

      setCategorias(cats);
      setSubcategorias(subs);
      setElementos(els);
      setRamas(rms);
      setAldeas(alds);
      setSubespecialidades(subEsps);
      setPersonajes(pjs || []);
      setElementosCatalogo(catalogElems || []);
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
      <div className="flex flex-col items-center justify-center py-32 gap-6 animate-in fade-in duration-500">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 border-4 border-oro/10 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-oro rounded-full animate-spin shadow-[0_0_15px_rgba(212,175,55,0.2)]" />
          <Sparkles className="absolute inset-0 m-auto text-oro w-6 h-6 animate-pulse" />
        </div>
        <span className="text-oro font-black uppercase tracking-[0.3em] text-caption text-center">Sincronizando Glosario Ancestral...</span>
      </div>
    );
  }

  if (activeSection === 'hub') {
    return (
      <div className="max-w-[1750px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="ninja-card-oro p-8 xl:p-10">
          <Link href="/admin" className="flex items-center gap-3 text-oro/40 hover:text-oro transition-all mb-8 text-caption font-black uppercase tracking-[0.3em] group">
            <div className="w-1.5 h-1.5 bg-oro/20 group-hover:bg-oro rotate-45 transition-colors" />
            VOLVER AL PANEL CENTRAL
          </Link>
          
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-oro/[0.03] border border-oro/10 flex items-center justify-center">
              <Box className="w-6 h-6 text-oro" />
            </div>
            <div>
              <h1 className="ninja-title text-4xl xl:text-5xl italic">GLOSARIO MAESTRO</h1>
              <p className="text-oro/40 text-caption xl:text-xs font-black uppercase tracking-[0.4em] mt-2">CONTROL CENTRAL DE TÉCNICAS, OBJETOS Y PASIVAS</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <HubCard title="Glosario" desc="Administra todas las técnicas, artes, habilidades y jutsus." icon={<Box size={32} />} count={elementos.filter(e => e.activo).length} onClick={() => { setActiveSection('elementos'); setSearch(''); setViewStatus('active'); }} color="gold" />
          <HubCard title="Categorías" desc="Gestiona las categorías principales de la biblioteca del sistema." icon={<Tag size={32} />} count={categorias.filter(c => c.activo).length} onClick={() => { setActiveSection('categorias'); setSearch(''); setViewStatus('active'); }} color="gold" />
          <HubCard title="Subcategorías" desc="Vincula subcategorías a las ramas y especializaciones del rol." icon={<Layers size={32} />} count={subcategorias.filter(s => s.activo).length} onClick={() => { setActiveSection('subcategorias'); setSearch(''); setViewStatus('active'); }} color="gold" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div
        className="space-y-8 ninja-card-oro p-8 md:p-12 mb-8 ninja-clip-lg"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-oro/10 pb-6 mb-6">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setActiveSection('hub')}
              className="flex items-center gap-3 text-oro/60 hover:text-oro transition-all mb-4 text-caption font-black uppercase tracking-[0.3em] group cursor-pointer bg-transparent border-none p-0 outline-none align-middle"
            >
              <div className="w-1.5 h-1.5 bg-oro/40 group-hover:bg-oro rotate-45 transition-colors" />
              VOLVER AL MENÚ DE GLOSARIO
            </button>
            <h2 className="ninja-title text-3xl sm:text-4xl xl:text-5xl leading-none">
              PANEL DE <span className="text-white">{activeSection.toUpperCase()}</span>
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-black/60 p-1.5 rounded-2xl border border-oro/10 backdrop-blur-md">
              <button onClick={() => setViewStatus('active')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-caption uppercase tracking-widest transition-all ${viewStatus === 'active' ? 'bg-oro text-black shadow-lg shadow-oro/10' : 'text-oro/40 hover:text-oro/80'}`}><Eye size={14} /> Activas</button>
              <button onClick={() => setViewStatus('archived')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-caption uppercase tracking-widest transition-all ${viewStatus === 'archived' ? 'bg-zinc-800 text-zinc-300 shadow-lg' : 'text-oro/40 hover:text-oro/80'}`}><Archive size={14} /> Archivadas</button>
            </div>
            <button onClick={() => setShowNewForm(true)} className="ninja-btn-oro px-6 py-4 text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-2xl"><Plus size={16} strokeWidth={3} /> Nuevo Registro</button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-oro/40 group-focus-within:text-oro transition-colors w-5 h-5" />
            <input type="text" placeholder={`Buscar en ${activeSection}...`} value={search} onChange={(e) => setSearch(e.target.value)} className="ninja-input w-full pl-14 text-sm bg-black/40" />
          </div>
          {activeSection === 'elementos' && (
            <div className="flex items-center gap-2 bg-black/40 border border-oro/10 rounded-2xl px-5 py-2">
              <Filter size={16} className="text-oro/40" />
              <NinjaSelect
                variant="inline"
                value={filterCat || ''}
                onChange={(val) => setFilterCat(val ? Number(val) : null)}
                placeholder="Todas las Categorías"
                options={[
                  ...categorias.map((c: any) => ({ label: c.nombre, value: c.id }))
                ]}
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 mt-6">
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
              <div
                key={c.id}
                className="group p-8 bg-black/30 border border-oro/10 rounded-none hover:bg-black/50 transition-all hover:border-oro/20 ninja-card-oro"
                style={{ clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)' }}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-3 rounded-xl ${c.activo ? 'bg-oro/10 text-oro' : 'bg-zinc-800 text-zinc-500'}`}><Tag size={20} /></div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingCat(c); setShowNewForm(true); }} className="p-2 text-oro/60 hover:text-oro transition-colors"><Save size={18} /></button>
                    <button onClick={async () => {
                      const ok = await confirmAction({
                        title: 'Eliminar Categoría',
                        message: '¿Borrar esta categoría? Podría haber elementos que dependan de ella.',
                        variant: 'danger',
                        requireValidation: true
                      });
                      if (ok) AdminService.deleteGlosarioCategoria(c.id).then(fetchData);
                    }} className="p-2 text-oro/60 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                  </div>
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">{c.nombre}</h3>
                <div className="flex items-center gap-3"><code className="text-caption font-mono text-oro/50 bg-black/60 px-2 py-1 rounded">/{c.slug}</code>{!c.activo && <span className="text-caption font-black text-zinc-500 uppercase tracking-widest border border-zinc-800 px-2 py-0.5 rounded-full">Archivado</span>}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredData().map((s: any) => (
              <div
                key={s.id}
                className="group p-8 bg-black/30 border border-oro/10 rounded-none hover:bg-black/50 transition-all hover:border-oro/20 ninja-card-oro"
                style={{ clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)' }}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-3 rounded-xl ${s.activo ? 'bg-oro/10 text-oro' : 'bg-zinc-800 text-zinc-500'}`}><Layers size={20} /></div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingSub(s); setShowNewForm(true); }} className="p-2 text-oro/60 hover:text-oro transition-colors"><Save size={18} /></button>
                    <button onClick={async () => {
                      const ok = await confirmAction({
                        title: 'Eliminar Subcategoría',
                        message: '¿Borrar esta subcategoría? Podría haber elementos vinculados.',
                        variant: 'danger',
                        requireValidation: true
                      });
                      if (ok) AdminService.deleteGlosarioSubcategoria(s.id).then(fetchData);
                    }} className="p-2 text-oro/60 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                  </div>
                </div>
                <div className="space-y-1 mb-4"><span className="text-caption font-black text-oro uppercase tracking-widest">{categorias.find(c => c.id === s.categoria_id)?.nombre || 'Sin Padre'}</span><h3 className="text-xl font-black text-white uppercase tracking-tight">{s.nombre}</h3></div>
                <div className="flex items-center gap-3"><code className="text-caption font-mono text-oro/50 bg-black/60 px-2 py-1 rounded">/{s.slug}</code>{!s.activo && <span className="text-caption font-black text-zinc-500 uppercase tracking-widest border border-zinc-800 px-2 py-0.5 rounded-full">Archivado</span>}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(showNewForm || editingId) && activeSection === 'elementos' && (
        <ElementoForm
          initialData={elementos.find(e => e.id === editingId)}
          categorias={categorias}
          subcategorias={subcategorias}
          ramas={ramas}
          aldeas={aldeas}
          subespecialidades={subespecialidades}
          personajes={personajes}
          elementosCatalogo={elementosCatalogo}
          onClose={() => { setShowNewForm(false); setEditingId(null); }}
          onSave={handleSaveElemento}
          loading={saving}
        />
      )}

      {(showNewForm || editingCat) && activeSection === 'categorias' && (
        <GenericForm
          title={editingCat ? 'Editar Categoría' : 'Nueva Categoría'}
          initialData={editingCat || { nombre: '', slug: '', activo: true }}
          fields={[
            { name: 'nombre', label: 'Nombre' },
            { name: 'slug', label: 'Slug' },
            { name: 'activo', label: 'Estado', type: 'toggle' }
          ]}
          onClose={() => { setShowNewForm(false); setEditingCat(null); }}
          onSave={async (cat: any) => {
            setSaving(true);
            try {
              await AdminService.saveGlosarioCategoria(cat);
              addToast('Categoría guardada correctamente', 'success');
              await fetchData();
              setShowNewForm(false);
              setEditingCat(null);
            } catch (err: any) {
              addToast(err?.message || 'Error al guardar la categoría', 'error');
            } finally {
              setSaving(false);
            }
          }}
          loading={saving}
        />
      )}

      {(showNewForm || editingSub) && activeSection === 'subcategorias' && (
        <GenericForm
          title={editingSub ? 'Editar Subcategoría' : 'Nueva Subcategoría'}
          initialData={editingSub || { nombre: '', slug: '', categoria_id: 0, activo: true }}
          fields={[
            { name: 'nombre', label: 'Nombre' },
            { name: 'slug', label: 'Slug' },
            { name: 'categoria_id', label: 'Categoría Padre', type: 'select', options: categorias },
            { name: 'activo', label: 'Estado', type: 'toggle' }
          ]}
          onClose={() => { setShowNewForm(false); setEditingSub(null); }}
          onSave={async (sub: any) => {
            setSaving(true);
            try {
              await AdminService.saveGlosarioSubcategoria(sub);
              addToast('Subcategoría guardada correctamente', 'success');
              await fetchData();
              setShowNewForm(false);
              setEditingSub(null);
            } catch (err: any) {
              addToast(err?.message || 'Error al guardar la subcategoría', 'error');
            } finally {
              setSaving(false);
            }
          }}
          loading={saving}
        />
      )}
    </div>
  );
}

function HubCard({ title, desc, icon, count, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="group relative p-12 bg-black/40 border border-oro/10 hover:border-oro/30 text-left transition-all hover:scale-[1.02] active:scale-95 ninja-card-oro"
      style={{ clipPath: 'polygon(24px 0, 100% 0, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0 100%, 0 24px)' }}
    >
      <div className="mb-8 p-6 rounded-2xl bg-oro/5 border border-oro/10 text-oro w-fit group-hover:scale-110 transition-transform">{icon}</div>
      <div className="space-y-3 mb-10"><h3 className="text-3xl font-black text-white uppercase tracking-tight">{title}</h3><p className="text-oro/40 text-sm leading-relaxed">{desc}</p></div>
      <div className="flex items-center justify-between"><div className="flex items-center gap-3 bg-black/60 px-5 py-2.5 rounded-xl border border-oro/10"><span className="text-oro font-black text-lg leading-none">{count}</span><span className="text-oro/30 font-black text-caption uppercase tracking-widest">Activos</span></div><div className="w-12 h-12 rounded-full bg-oro/5 border border-oro/10 text-oro flex items-center justify-center group-hover:bg-oro group-hover:text-black transition-all"><ArrowRight size={20} /></div></div>
    </button>
  );
}

function ElementoCard({ elemento, categorias, subcategorias, onEdit, onDelete }: any) {
  const cat = categorias.find((c: any) => c.id === elemento.categoria_id);
  const sub = subcategorias.find((s: any) => s.id === elemento.subcategoria_id);
  const elem = elemento.info_elementos;

  return (
    <div
      className={`group border rounded-none p-8 flex flex-col md:flex-row items-center gap-8 transition-all ninja-card-oro ${elemento.activo ? 'bg-black/30 border-oro/10 hover:border-oro/30 hover:bg-black/50' : 'bg-black/80 border-oro/5 opacity-50'}`}
      style={{ clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)' }}
    >
      <div className="flex flex-col items-center gap-2"><div className={`w-3 h-3 rounded-full ${elemento.activo ? 'bg-oro shadow-[0_0_12px_rgba(212,175,55,0.6)]' : 'bg-zinc-800'}`} /><span className="text-oro/30 font-black text-caption uppercase">ID: {elemento.id}</span></div>
      <div className="flex-1 text-center md:text-left space-y-1">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
          <span className="bg-oro/10 text-oro border border-oro/20 px-3 py-1 rounded-full text-caption font-black uppercase tracking-tighter">{cat?.nombre || 'Sin Cat'}</span>
          {sub && <span className="bg-emerald-500/10 text-emerald-400 border border-success-text/20 px-3 py-1 rounded-full text-caption font-black uppercase tracking-tighter">{sub.nombre}</span>}
          {elem && <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full text-caption font-black uppercase tracking-tighter">⚡ {elem.nombre_esp}</span>}
          {elemento.rango && <span className="bg-zinc-800 text-zinc-300 border border-zinc-700 px-3 py-1 rounded-full text-caption font-black uppercase tracking-tighter">Rango: {elemento.rango}</span>}
          {elemento.obligatoria_ascenso && <span className="bg-red-500/10 text-red-400 border border-error-text/20 px-3 py-1 rounded-full text-caption font-black uppercase tracking-tighter flex items-center gap-1">🔺 Obligatoria Ascenso</span>}
          {elemento.inicial && <span className="bg-oro text-black px-3 py-1 rounded-full text-caption font-black uppercase tracking-tighter flex items-center gap-1"><Star size={10} className="fill-black" /> Inicial</span>}
        </div>
        <h3 className="text-white font-black text-xl uppercase tracking-tight group-hover:text-oro transition-colors">{elemento.nombre_es}</h3><p className="text-oro/50 font-medium italic text-sm">{elemento.nombre_jp || '-'}</p>
      </div>
      <div className="flex flex-wrap gap-4">
        <div className="bg-black/40 px-6 py-4 rounded-2xl border border-oro/10 text-center min-w-[100px]"><p className="text-caption font-black text-oro/40 uppercase tracking-widest mb-1">Coste EXP</p><p className="text-oro font-black text-lg">{elemento.coste_exp?.toLocaleString()}</p></div>
        <div className="bg-black/40 px-6 py-4 rounded-2xl border border-oro/10 text-center min-w-[100px]"><p className="text-caption font-black text-oro/40 uppercase tracking-widest mb-1">Coste Ryo</p><p className="text-amber-500 font-black text-lg">{elemento.coste_ryous?.toLocaleString()}</p></div>
        <div className="bg-black/40 px-6 py-4 rounded-2xl border border-oro/10 text-center min-w-[100px]"><p className="text-caption font-black text-oro/40 uppercase tracking-widest mb-1">Coste PA</p><p className="text-blue-400 font-black text-lg">{elemento.coste_puntos_aprendizaje || 0}</p></div>
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
        <button onClick={onEdit} className="p-4 bg-oro/5 border border-oro/10 hover:bg-oro hover:text-black rounded-xl text-oro transition-all">
          <Save size={18} />
        </button>
        <button onClick={onDelete} className="p-4 bg-red-950/20 border border-error-text/20 hover:bg-red-500 hover:text-black rounded-xl text-red-400 transition-all">
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}

function ElementoForm({ initialData, categorias, subcategorias, ramas, aldeas, subespecialidades, personajes, elementosCatalogo, onClose, onSave, loading }: any) {
  const defaultRequisitos = {
    stats: { fue: 0, agi: 0, int: 0, est: 0, nin: 0, gen: 0, tai: 0, sm: 0 },
    rango: null,
    misiones: { D: 0, C: 0, B: 0, A: 0, S: 0 },
    combates: 0,
    rama_id: null,
    elemento_id: null,
    personaje_id: null
  };

  const [formData, setFormData] = useState<Partial<Glosario>>(() => {
    if (!initialData) {
      return {
        nombre_es: '',
        nombre_jp: '',
        categoria_id: 0,
        subcategoria_id: undefined,
        aldea_id: null,
        rama_clan_id: null,
        sub_especialidad_id: null,
        elemento_id: null,
        coste_exp: 0,
        coste_ryous: 0,
        activo: true,
        inicial: false,
        rango: null,
        obligatoria_ascenso: false,
        requisitos: defaultRequisitos
      };
    }
    return {
      ...initialData,
      aldea_id: initialData.aldea_id ?? null,
      rama_clan_id: initialData.rama_clan_id ?? null,
      sub_especialidad_id: initialData.sub_especialidad_id ?? null,
      elemento_id: initialData.elemento_id ?? null,
      coste_ryous: initialData.coste_ryous || 0,
      inicial: initialData.inicial || false,
      rango: initialData.rango ?? null,
      obligatoria_ascenso: initialData.obligatoria_ascenso || false,
      requisitos: { ...defaultRequisitos, ...initialData.requisitos }
    };
  });

  const filteredSubs = subcategorias.filter((s: any) => s.categoria_id === formData.categoria_id);
  const filteredRamas = ramas.filter((r: any) => {
    const rAldea = r.aldea_id === null || r.aldea_id === undefined ? null : Number(r.aldea_id);
    const fAldea = formData.aldea_id === null || formData.aldea_id === undefined ? null : Number(formData.aldea_id);
    return rAldea === fAldea;
  });
  const filteredSpec = formData.rama_clan_id
    ? subespecialidades.filter((s: any) => Number(s.rama_id) === Number(formData.rama_clan_id))
    : [];

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

  // Identificador de Rama Ninjutsu Elemental es 4
  const isNinjutsuElemental = Number(formData.rama_clan_id) === 4;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <div
        className="relative bg-neutral-800 border border-oro/20 w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 ninja-card-oro"
        style={{ 
          clipPath: 'polygon(30px 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%, 0 30px)',
          overflow: 'hidden'
        }}
      >
        {/* Cabecera Fija */}
        <div className="px-12 py-6 flex items-center justify-between border-b border-oro/10 shrink-0">
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{initialData ? 'Editar Registro' : 'Nuevo Registro'}</h2>
          <button onClick={onClose} className="p-4 bg-oro/5 border border-oro/10 hover:bg-oro hover:text-black rounded-xl text-oro transition-all"><X size={20} /></button>
        </div>

        {/* Cuerpo con Scroll Custom (Sin clip-path para evitar cortar scrollbar) */}
        <div className="flex-1 overflow-y-auto px-12 py-8 space-y-10 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div className="space-y-8">
              <div
                className="bg-black/50 p-8 border border-oro/10 space-y-6"
                style={{ clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)' }}
              >
                <h3 className="flex items-center gap-3 text-sm font-black text-oro/60 uppercase tracking-widest mb-4"><Box size={16} /> Información Base</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-caption font-black uppercase tracking-widest text-oro/40 ml-1">Nombre Español</label>
                    <input type="text" value={formData.nombre_es} onChange={(e) => setFormData({ ...formData, nombre_es: e.target.value })} className="ninja-input w-full px-6 py-4 text-white bg-black/60 font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-caption font-black uppercase tracking-widest text-oro/40 ml-1">Nombre Japonés</label>
                    <input type="text" value={formData.nombre_jp || ''} onChange={(e) => setFormData({ ...formData, nombre_jp: e.target.value })} className="ninja-input w-full px-6 py-4 text-white bg-black/60 font-bold" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-caption font-black uppercase tracking-widest text-oro/40 ml-1">Categoría</label>
                      <NinjaSelect
                        value={formData.categoria_id || ''}
                        onChange={(val) => setFormData({ ...formData, categoria_id: Number(val), subcategoria_id: undefined })}
                        placeholder="Seleccionar..."
                        options={categorias.map((c: any) => ({ label: c.nombre, value: c.id }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-caption font-black uppercase tracking-widest text-oro/40 ml-1">Subcategoría</label>
                      <NinjaSelect
                        value={formData.subcategoria_id || ''}
                        onChange={(val) => setFormData({ ...formData, subcategoria_id: val ? Number(val) : undefined })}
                        placeholder="Ninguna"
                        options={filteredSubs.map((s: any) => ({ label: s.nombre, value: s.id }))}
                      />
                    </div>
                  </div>

                  {/* Casillas de Jerarquía */}
                  <div className="pt-4 border-t border-oro/10 space-y-4">
                    <label className="text-caption font-black uppercase tracking-widest text-oro ml-1">Jerarquía de Visualización</label>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <label className="text-caption font-black uppercase tracking-widest text-oro/40 ml-1">Aldea / Nación</label>
                        <NinjaSelect
                          value={formData.aldea_id || ''}
                          onChange={(val) => setFormData({ ...formData, aldea_id: val ? Number(val) : null, rama_clan_id: null, sub_especialidad_id: null, elemento_id: null })}
                          placeholder="General"
                          options={aldeas.map((a: any) => ({ label: a.nombre_completo, value: a.id }))}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-caption font-black uppercase tracking-widest text-oro/40 ml-1">Rama / Clan</label>
                          <NinjaSelect
                            value={formData.rama_clan_id || ''}
                            onChange={(val) => setFormData({ ...formData, rama_clan_id: val ? Number(val) : null, sub_especialidad_id: null, elemento_id: null })}
                            placeholder="Ninguno"
                            options={filteredRamas.map((r: any) => ({ label: r.nombre, value: r.id }))}
                          />
                        </div>
                        {isNinjutsuElemental ? (
                          <div className="space-y-2">
                            <label className="text-caption font-black uppercase tracking-widest text-oro/40 ml-1">Elemento Asociado</label>
                            <NinjaSelect
                              value={formData.elemento_id || ''}
                              onChange={(val) => setFormData({ ...formData, elemento_id: val ? Number(val) : null, sub_especialidad_id: null })}
                              placeholder="Sin Elemento"
                              options={elementosCatalogo.map((e: any) => ({ label: e.nombre_esp, value: e.id }))}
                            />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <label className="text-caption font-black uppercase tracking-widest text-oro/40 ml-1">Subespecialidad</label>
                            <NinjaSelect
                              value={formData.sub_especialidad_id || ''}
                              onChange={(val) => setFormData({ ...formData, sub_especialidad_id: val ? Number(val) : null, elemento_id: null })}
                              placeholder="Ninguna"
                              options={filteredSpec.map((s: any) => ({ label: s.nombre, value: s.id }))}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="bg-black/50 p-8 border border-oro/10 space-y-6"
                style={{ clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)' }}
              >
                <h3 className="flex items-center gap-3 text-sm font-black text-oro/60 uppercase tracking-widest mb-4"><Star size={16} /> Costes y Estado</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-caption font-black uppercase tracking-widest text-oro/40 ml-1">Coste EXP</label>
                    <input type="number" min="0" value={formData.coste_exp} onChange={(e) => setFormData({ ...formData, coste_exp: Math.max(0, Number(e.target.value)) })} className="ninja-input w-full px-6 py-4 text-white bg-black/60 font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-caption font-black uppercase tracking-widest text-oro/40 ml-1">Coste Ryo</label>
                    <input type="number" min="0" value={formData.coste_ryous} onChange={(e) => setFormData({ ...formData, coste_ryous: Math.max(0, Number(e.target.value)) })} className="ninja-input w-full px-6 py-4 text-white bg-black/60 font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-caption font-black uppercase tracking-widest text-blue-400/60 ml-1">Coste PA</label>
                    <input type="number" min="0" value={(formData as any).coste_puntos_aprendizaje ?? 0} onChange={(e) => setFormData({ ...formData, coste_puntos_aprendizaje: Math.max(0, Number(e.target.value)) } as any)} className="ninja-input w-full px-6 py-4 text-blue-400 bg-black/60 font-bold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setFormData({ ...formData, activo: !formData.activo })} className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all ${formData.activo ? 'bg-oro/10 border-oro/20 text-oro shadow-lg' : 'bg-black/60 border-oro/5 text-oro/40'}`}>
                    <span className="font-black text-xs uppercase tracking-widest ml-2">{formData.activo ? 'Activo' : 'Archivado'}</span>
                    {formData.activo ? <Check size={20} /> : <Archive size={20} />}
                  </button>
                  <button onClick={() => setFormData({ ...formData, inicial: !formData.inicial })} className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all ${formData.inicial ? 'bg-oro text-black shadow-lg shadow-oro/10 border-oro' : 'bg-black/60 border-oro/5 text-oro/40'}`}>
                    <span className="font-black text-xs uppercase tracking-widest ml-2">{formData.inicial ? 'Inicial' : 'No Inicial'}</span>
                    {formData.inicial ? <Star size={20} className="fill-black text-black" /> : <Plus size={20} />}
                  </button>
                </div>
                <div className="space-y-4 pt-4 border-t border-oro/10">
                  <div className="space-y-2">
                    <label className="text-caption font-black uppercase tracking-widest text-oro/40 ml-1">Rango del Elemento</label>
                    <div className="flex gap-1 bg-black p-1 rounded-xl border border-oro/10">
                      {RANGOS.map(r => (
                        <button type="button" key={r} onClick={() => {
                          const newReqs = { ...formData.requisitos, rango: r };
                          setFormData({ ...formData, rango: r, requisitos: newReqs });
                        }} className={`flex-1 py-3 rounded-lg font-black text-xs transition-all ${formData.rango === r ? 'bg-oro text-black' : 'text-oro/40 hover:bg-oro/5'}`}>{r}</button>
                      ))}
                      <button type="button" onClick={() => {
                        const newReqs = { ...formData.requisitos, rango: null };
                        setFormData({ ...formData, rango: null, requisitos: newReqs });
                      }} className={`flex-1 py-3 rounded-lg font-black text-caption transition-all ${formData.rango === null ? 'bg-zinc-800 text-white' : 'text-oro/40 hover:bg-oro/5'}`}>Ninguno</button>
                    </div>
                  </div>
                  <button type="button" onClick={() => setFormData({ ...formData, obligatoria_ascenso: !formData.obligatoria_ascenso })} className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all ${formData.obligatoria_ascenso ? 'bg-red-500/10 border-error-text/20 text-red-400 shadow-lg' : 'bg-black/60 border-oro/5 text-oro/40'}`}>
                    <span className="font-black text-xs uppercase tracking-widest ml-2">{formData.obligatoria_ascenso ? 'Obligatoria para Ascenso' : 'No es obligatoria para Ascenso'}</span>
                    {formData.obligatoria_ascenso ? <Check size={20} /> : <X size={20} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div
                className="bg-black/30 p-10 border border-oro/10 space-y-10"
                style={{ clipPath: 'polygon(24px 0, 100% 0, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0 100%, 0 24px)' }}
              >
                <div className="flex items-center justify-between"><h3 className="flex items-center gap-3 text-lg font-black text-white uppercase tracking-tighter"><ScrollText size={20} className="text-oro" /> Requisitos del Sistema</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="flex items-center gap-2 text-caption font-black uppercase tracking-widest text-oro/40 ml-1"><Swords size={12} /> Atributos Necesarios</label>
                    <div className="grid grid-cols-1 gap-2">
                      {STATS_LIST.map(s => (
                        <div key={s.key} className="flex items-center justify-between bg-black/60 p-2 pl-4 rounded-xl border border-oro/10 group hover:border-oro/30 transition-all">
                          <span className="text-caption font-bold text-oro/50 uppercase tracking-widest">{s.label}</span>
                          <input type="number" min="0" value={formData.requisitos?.stats?.[s.key] ?? ''} placeholder="0" onChange={(e) => updateNestedReq('stats', s.key, e.target.value)} className="w-16 bg-black border border-oro/20 rounded-lg px-2 py-1.5 text-center text-oro font-black text-xs outline-none focus:border-oro transition-all" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <label className="flex items-center gap-2 text-caption font-black uppercase tracking-widest text-oro/40 ml-1"><Star size={12} /> Rango Mínimo</label>
                      <div className="flex gap-1 bg-black p-1 rounded-xl border border-oro/10">
                        {RANGOS.map(r => (
                          <button key={r} onClick={() => updateReq('rango', formData.requisitos?.rango === r ? null : r)} className={`flex-1 py-3 rounded-lg font-black text-xs transition-all ${formData.requisitos?.rango === r ? 'bg-oro text-black' : 'text-oro/40 hover:bg-oro/5'}`}>{r}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="flex items-center gap-2 text-caption font-black uppercase tracking-widest text-oro/40 ml-1"><Trophy size={12} /> Misiones por Rango</label>
                      <div className="grid grid-cols-5 gap-2">
                        {RANGOS.map(r => (
                          <div key={`mis-${r}`} className="space-y-1">
                            <span className="block text-center text-caption font-black text-oro/40">{r}</span>
                            <input type="number" min="0" value={formData.requisitos?.misiones?.[r] ?? 0} onChange={(e) => updateNestedReq('misiones', r, e.target.value)} className="w-full bg-black border border-oro/20 rounded-lg py-2 text-center text-oro font-black text-xs outline-none focus:border-oro transition-all" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-oro/10">
                  <SearchableSelect
                    label="Rama / Clan"
                    icon={<Layers size={12} />}
                    options={(ramas || []).map((r: any) => ({ id: r.id, label: r.nombre }))}
                    value={formData.requisitos?.rama_id}
                    onChange={(id: any) => updateReq('rama_id', id)}
                  />
                  <SearchableSelect
                    label="Elemento Requerido"
                    icon={<Flame size={12} />}
                    options={(elementosCatalogo || []).map((e: any) => ({ id: e.id, label: e.nombre_esp }))}
                    value={formData.requisitos?.elemento_id}
                    onChange={(id: any) => updateReq('elemento_id', id)}
                  />
                  <div className="md:col-span-2">
                    <SearchableMultiSelect
                      label="Exclusivo para"
                      icon={<User size={12} />}
                      options={(personajes || []).map((p: any) => ({ id: p.id, label: p.nombre_ninja }))}
                      value={formData.requisitos?.personaje_id}
                      onChange={(ids: any) => updateReq('personaje_id', ids)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pie de Página Fijo */}
        <div className="px-12 py-6 border-t border-oro/10 flex justify-end shrink-0 bg-[#07050A]">
          <button onClick={() => onSave(formData)} disabled={loading} className="ninja-btn-oro px-16 py-5 text-sm flex items-center gap-4 shadow-2xl active:scale-95">
            <Save size={20} /> Finalizar y Guardar
          </button>
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
      <label className="flex items-center gap-2 text-caption font-black uppercase tracking-widest text-oro/40 ml-1">{icon} {label}</label>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between bg-black/60 border border-oro/10 rounded-2xl px-6 py-4 text-white font-bold outline-none hover:border-oro/30 transition-all text-left">
        <span className={selectedOption ? 'text-white' : 'text-oro/30'}>{selectedOption ? selectedOption.label : 'Seleccionar...'}</span>
        <ChevronDown size={16} className={`text-oro/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-[60] bottom-full mb-2 w-full bg-[#0E0E0E] border border-oro/20 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          <div className="p-3 border-b border-oro/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-oro/40" size={14} />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus className="w-full bg-black border border-oro/10 rounded-xl pl-9 pr-4 py-2 text-white text-xs font-bold outline-none focus:border-oro" placeholder="Buscar..." />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            <button onClick={() => { onChange(null); setOpen(false); }} className="w-full text-left px-4 py-3 text-caption font-black text-oro/40 hover:bg-oro/5 uppercase tracking-widest">Ninguno / Quitar selección</button>
            {filteredOptions.map((o: any) => (
              <button key={o.id} onClick={() => { onChange(o.id); setOpen(false); }} className={`w-full text-left px-4 py-3 text-xs font-bold transition-all hover:bg-oro hover:text-black ${o.id === value ? 'bg-oro/10 text-oro' : 'text-white'}`}>{o.label}</button>
            ))}
            {filteredOptions.length === 0 && <div className="px-4 py-8 text-center text-caption font-black text-oro/30 uppercase">Sin resultados</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function SearchableMultiSelect({ label, icon, options, value, onChange }: any) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedIds: number[] = useMemo(() => {
    if (Array.isArray(value)) return value.map(id => Number(id));
    if (value) return [Number(value)];
    return [];
  }, [value]);

  const selectedOptions = options.filter((o: any) => selectedIds.includes(Number(o.id)));
  const filteredOptions = options.filter((o: any) => o.label.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (id: number) => {
    const isSelected = selectedIds.includes(id);
    let newSelected: number[];
    if (isSelected) {
      newSelected = selectedIds.filter(x => x !== id);
    } else {
      newSelected = [...selectedIds, id];
    }
    onChange(newSelected.length > 0 ? newSelected : null);
  };

  return (
    <div className="relative space-y-2 text-left" ref={containerRef}>
      <label className="flex items-center gap-2 text-caption font-black uppercase tracking-widest text-oro/40 ml-1">{icon} {label}</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-black/60 border border-oro/10 rounded-2xl px-6 py-4 text-white font-bold outline-none hover:border-oro/30 transition-all text-left"
      >
        <span className={selectedOptions.length > 0 ? 'text-white' : 'text-oro/30'}>
          {selectedOptions.length > 0 ? `${selectedOptions.length} seleccionados` : 'Seleccionar personajes...'}
        </span>
        <ChevronDown size={16} className={`text-oro/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedOptions.map((o: any) => (
            <span key={o.id} className="inline-flex items-center gap-1.5 bg-oro/10 border border-oro/20 text-oro text-caption font-black uppercase tracking-wider px-2.5 py-1 rounded-xl">
              {o.label}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleOption(Number(o.id)); }}
                className="hover:text-red-400 transition-colors"
              >
                <X size={10} strokeWidth={3} />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="absolute z-[60] bottom-full mb-2 w-full bg-[#0E0E0E] border border-oro/20 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          <div className="p-3 border-b border-oro/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-oro/40" size={14} />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus className="w-full bg-black border border-oro/10 rounded-xl pl-9 pr-4 py-2 text-white text-xs font-bold outline-none focus:border-oro" placeholder="Buscar..." />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            <button type="button" onClick={() => { onChange(null); setOpen(false); }} className="w-full text-left px-4 py-3 text-caption font-black text-oro/40 hover:bg-oro/5 uppercase tracking-widest">Ninguno / Quitar todos</button>
            {filteredOptions.map((o: any) => {
              const isSelected = selectedIds.includes(Number(o.id));
              return (
                <button
                  type="button"
                  key={o.id}
                  onClick={() => toggleOption(Number(o.id))}
                  className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold transition-all hover:bg-oro hover:text-black ${isSelected ? 'bg-oro/10 text-oro' : 'text-white'}`}
                >
                  <span>{o.label}</span>
                  {isSelected && <Check size={14} strokeWidth={3} className="text-oro" />}
                </button>
              );
            })}
            {filteredOptions.length === 0 && <div className="px-4 py-8 text-center text-caption font-black text-oro/30 uppercase">Sin resultados</div>}
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
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <div
        className="relative bg-neutral-800 border border-oro/20 w-full max-w-lg rounded-none shadow-2xl animate-in zoom-in-95 ninja-card-oro"
        style={{ clipPath: 'polygon(24px 0, 100% 0, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0 100%, 0 24px)' }}
      >
        <div className="p-10 space-y-8">
          <div className="flex justify-between items-center"><h2 className="text-2xl font-black text-white uppercase tracking-tighter">{title}</h2><button onClick={onClose} className="p-3 bg-oro/5 border border-oro/10 hover:bg-oro hover:text-black text-oro rounded-xl transition-colors"><X size={16} /></button></div>
          <div className="space-y-5">
            {fields.map((f: any) => (
              <div key={f.name} className="space-y-1">
                <label className="text-caption font-black uppercase tracking-widest text-oro/40 ml-1">{f.label}</label>
                {f.type === 'select' ? (
                  <NinjaSelect
                    value={formData[f.name] || ''}
                    onChange={(val) => handleFieldChange(f.name, Number(val))}
                    placeholder="Seleccionar..."
                    options={f.options.map((o: any) => ({ label: o.nombre, value: o.id }))}
                  />
                ) : f.type === 'toggle' ? (
                  <button onClick={() => handleFieldChange(f.name, !formData[f.name])} className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${formData[f.name] ? 'bg-oro/10 border-oro/20 text-oro shadow-lg' : 'bg-black/60 border-oro/5 text-oro/40'}`}><span className="font-black text-caption uppercase tracking-widest ml-2">{formData[f.name] ? 'Activo' : 'Archivado'}</span>{formData[f.name] ? <Check size={18} /> : <X size={18} />}</button>
                ) : (
                  <input type="text" value={formData[f.name]} onChange={(e) => handleFieldChange(f.name, e.target.value)} className="ninja-input w-full px-6 py-4 text-white bg-black/60 font-bold" />
                )}
              </div>
            ))}
          </div>
          <button onClick={() => onSave(formData)} disabled={loading} className="ninja-btn-oro w-full py-5 rounded-xl font-black text-sm uppercase tracking-[0.2em] shadow-xl">{loading ? 'Guardando...' : 'Guardar Registro'}</button>
        </div>
      </div>
    </div>
  );
}

