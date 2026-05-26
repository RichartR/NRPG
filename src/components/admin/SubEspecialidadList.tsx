'use client';

import { useState, useMemo } from 'react';
import { Plus, Eye, EyeOff, Shield, Search, Edit2, Save, X, RefreshCw, PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AdminService } from '@/services/supabase/admin.service';
import { useToastStore } from '@/components/ui/Toast';
import { DataField, SearchableSelect } from '@/components/ui/Fields';
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
    es_repetible: false,
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
      setNewSub({ nombre: '', slug: '', rama_id: undefined, descripcion: '', url_imagen: '', es_repetible: false, activo: true });
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
    <div className="space-y-6">
      {/* Controles Superiores */}
      <div className="flex flex-col min-[1600px]:flex-row flex-wrap gap-6 justify-between items-stretch min-[1600px]:items-center bg-[#0A0A0A]/40 p-6 sm:p-10 xl:p-12 border border-oro/5 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-oro/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

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
              {tab === 'active' ? 'ACTIVAS' : 'ARCHIVADAS'}
              <span className={`ml-2 opacity-40 ${activeTab === tab ? 'text-rojo-sangre/60' : ''}`}>({subs.filter(s => tab === 'active' ? s.activo : !s.activo).length})</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap w-full min-[1600px]:w-auto gap-4 sm:gap-6 items-stretch sm:items-center">
          <div className="relative flex-1 sm:w-64 lg:w-72 xl:w-80">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-oro/40" />
            <input
              type="text"
              placeholder="BUSCAR SUB-CATEGORÍA..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/20 border border-oro/10 py-3 xl:py-4 pl-14 pr-8 text-[9px] sm:text-[10px] xl:text-xs font-black text-oro focus:border-oro/40 outline-none transition-all placeholder:text-oro/20 uppercase tracking-widest"
              style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
            />
          </div>

          <button
            onClick={() => setIsAdding(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 sm:px-10 py-3 xl:py-4 bg-rojo-sangre hover:brightness-125 text-oro font-black text-[9px] sm:text-[10px] xl:text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-rojo-sangre/20 active:scale-95 whitespace-nowrap"
            style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
          >
            <PlusCircle className="w-5 h-5 shrink-0" />
            NUEVA SUB-SPEC.
          </button>
        </div>
      </div>

      {/* Formulario de Creación */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-start sm:items-center justify-center p-4 sm:p-6 xl:p-12 overflow-y-auto">
          <div
            className="relative w-full max-w-3xl ninja-card-oro p-6 sm:p-10 xl:p-12 my-auto animate-in fade-in zoom-in duration-300"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-oro/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

            <header className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-10 relative z-10">
              <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-4">
                <div className="p-4 border border-oro/20 bg-oro/10 text-oro ninja-clip-sm shrink-0">
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="ninja-title text-xl sm:text-3xl leading-none">
                    CREAR SUB-ESPECIALIDAD
                  </h2>
                  <p className="text-[10px] font-black text-oro/40 uppercase tracking-[0.2em] mt-2 italic">Registrar una nueva sub-categoría especial en el sistema</p>
                </div>
              </div>

              <button onClick={() => setIsAdding(false)} className="p-2 text-oro/40 hover:text-rojo-sangre transition-all hover:rotate-90">
                <X className="w-8 h-8" />
              </button>
            </header>

            <form onSubmit={(e) => { e.preventDefault(); handleAdd(); }} className="space-y-8 relative z-10">
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
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-oro/60 ml-1">Repetibilidad</label>
                  <div className="flex bg-black/40 p-4 border border-oro/10 justify-between items-center h-[58px] ninja-clip-sm">
                    <span className="text-[11px] font-black uppercase tracking-widest text-oro/40">
                      ¿Es Sub-Especialidad Repetible en slots?
                    </span>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${newSub.es_repetible ? 'text-oro' : 'text-oro/20'}`}>
                        {newSub.es_repetible ? 'SÍ' : 'NO'}
                      </span>
                      <input
                        type="checkbox"
                        checked={newSub.es_repetible}
                        onChange={(e) => setNewSub({ ...newSub, es_repetible: e.target.checked })}
                        className="hidden"
                      />
                      <div className={`w-8 h-4 rounded-none transition-all relative ${newSub.es_repetible ? 'bg-oro/20 border-oro/40' : 'bg-black/40 border-oro/10'} border`}>
                        <div className={`absolute top-[2px] w-2.5 h-2.5 transition-all ${newSub.es_repetible ? 'right-[2px] bg-oro shadow-[0_0_10px_rgba(255,230,159,0.5)]' : 'left-[2px] bg-oro/10'}`} />
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-oro/60 ml-1">Descripción / Lore</label>
                <textarea
                  rows={4}
                  value={newSub.descripcion || ''}
                  onChange={e => setNewSub({ ...newSub, descripcion: e.target.value })}
                  className="w-full bg-black/40 border border-oro/10 py-5 px-8 text-oro font-black outline-none focus:border-oro/40 transition-all placeholder:text-oro/10 text-sm md:text-base ninja-clip-sm"
                  placeholder="Explica de qué trata esta sub-categoría..."
                />
              </div>

              <div className="flex justify-end gap-6 pt-10 border-t border-oro/10">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="ninja-btn-ghost px-10 py-5 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !newSub.nombre || !newSub.rama_id}
                  className="ninja-btn-oro px-12 py-5 text-sm flex items-center justify-center gap-3"
                >
                  {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  Crear Sub-Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Formulario de Edición */}
      {editingId !== null && editForm && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-start sm:items-center justify-center p-4 sm:p-6 xl:p-12 overflow-y-auto">
          <div
            className="relative w-full max-w-3xl ninja-card-oro p-6 sm:p-10 xl:p-12 my-auto animate-in fade-in zoom-in duration-300"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-oro/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

            <header className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-10 relative z-10">
              <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-4">
                <div className="p-4 border border-oro/20 bg-oro/10 text-oro ninja-clip-sm shrink-0">
                  <Edit2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="ninja-title text-xl sm:text-3xl leading-none">
                    EDITAR SUB-ESPECIALIDAD
                  </h2>
                  <p className="text-[10px] font-black text-oro/40 uppercase tracking-[0.2em] mt-2 italic">Modificar los parámetros de esta sub-categoría</p>
                </div>
              </div>

              <button onClick={() => { setEditingId(null); setEditForm(null); }} className="p-2 text-oro/40 hover:text-rojo-sangre transition-all hover:rotate-90">
                <X className="w-8 h-8" />
              </button>
            </header>

            <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }} className="space-y-8 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <DataField
                  label="Nombre"
                  value={editForm.nombre || ''}
                  onChange={v => {
                    setEditForm({ ...editForm, nombre: v, slug: v.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '') });
                  }}
                />
                <DataField label="Slug (URL)" value={editForm.slug || ''} onChange={v => setEditForm({ ...editForm, slug: v.toLowerCase().replace(/\s+/g, '-') })} />
                <SearchableSelect
                  label="Rama / Clan Padre"
                  value={editForm.rama_id}
                  options={ramas.map(r => ({ label: r.nombre, value: r.id }))}
                  onChange={v => setEditForm({ ...editForm, rama_id: Number(v) })}
                />
                <DataField
                  label="URL Imagen"
                  value={editForm.url_imagen || ''}
                  onChange={v => setEditForm({ ...editForm, url_imagen: v })}
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-oro/60 ml-1">Repetibilidad</label>
                  <div className="flex bg-black/40 p-4 border border-oro/10 justify-between items-center h-[58px] ninja-clip-sm">
                    <span className="text-[11px] font-black uppercase tracking-widest text-oro/40">
                      ¿Es Sub-Especialidad Repetible en slots?
                    </span>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${editForm.es_repetible ? 'text-oro' : 'text-oro/20'}`}>
                        {editForm.es_repetible ? 'SÍ' : 'NO'}
                      </span>
                      <input
                        type="checkbox"
                        checked={editForm.es_repetible || false}
                        onChange={(e) => setEditForm({ ...editForm, es_repetible: e.target.checked })}
                        className="hidden"
                      />
                      <div className={`w-8 h-4 rounded-none transition-all relative ${editForm.es_repetible ? 'bg-oro/20 border-oro/40' : 'bg-black/40 border-oro/10'} border`}>
                        <div className={`absolute top-[2px] w-2.5 h-2.5 transition-all ${editForm.es_repetible ? 'right-[2px] bg-oro shadow-[0_0_10px_rgba(255,230,159,0.5)]' : 'left-[2px] bg-oro/10'}`} />
                      </div>
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-6 pt-10 border-t border-oro/10">
                <button
                  type="button"
                  onClick={() => { setEditingId(null); setEditForm(null); }}
                  className="ninja-btn-ghost px-10 py-5 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !editForm.nombre || !editForm.rama_id}
                  className="ninja-btn-oro px-12 py-5 text-sm flex items-center justify-center gap-3"
                >
                  {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Edit2 className="w-5 h-5" />}
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Listado */}
      <div className="ninja-card-oro overflow-hidden border border-oro/10 bg-black/40 backdrop-blur-sm">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[800px] table-fixed">
            <thead>
              <tr className="border-b border-oro/10 text-oro/70 text-[10px] xl:text-xs font-black uppercase tracking-[0.3em] bg-black/20">
                <th className="py-6 px-8 w-[10%]">Símbolo</th>
                <th className="py-6 px-8 w-[30%]">Nombre</th>
                <th className="py-6 px-8 w-[25%]">Rama / Clan Padre</th>
                <th className="py-6 px-8 w-[15%]">Slug</th>
                <th className="py-6 px-8 w-[10%] text-center">Estado</th>
                <th className="py-6 px-8 text-right w-[10%]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-oro/5 bg-black/40">
              {filteredSubs.map((sub) => (
                <tr key={sub.id} className="hover:bg-oro/5 transition-colors group">
                  {/* Símbolo */}
                  <td className="py-5 px-8">
                    <div
                      className="w-12 h-12 bg-black/40 border border-oro/10 overflow-hidden flex items-center justify-center transition-all ninja-clip-xs"
                    >
                      {sub.url_imagen ? (
                        <img src={sub.url_imagen} alt={sub.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                      ) : (
                        <Shield className="w-5 h-5 text-oro/30 group-hover:text-oro transition-colors" />
                      )}
                    </div>
                  </td>

                  {/* Nombre */}
                  <td className="py-5 px-8">
                    <h3 className="text-base font-black text-oro uppercase italic tracking-tighter leading-none mb-0.5">{sub.nombre}</h3>
                    <p className="text-oro/40 text-[9px] font-black uppercase tracking-widest mt-1 leading-relaxed line-clamp-1">{sub.descripcion || 'Sin descripción.'}</p>
                  </td>

                  {/* Rama / Clan Padre */}
                  <td className="py-5 px-8">
                    <span
                      className="text-[9px] font-black text-oro/60 uppercase tracking-widest bg-oro/5 px-4 py-1.5 border border-oro/10 inline-block ninja-clip-xs"
                    >
                      {ramas.find(r => r.id === sub.rama_id)?.nombre || 'General'}
                    </span>
                  </td>

                  {/* Slug */}
                  <td className="py-5 px-8">
                    <span className="text-[9px] font-black text-oro/30 font-mono italic">/{sub.slug}</span>
                  </td>

                  {/* Estado */}
                  <td className="py-5 px-8 text-center">
                    <span className={`inline-block px-3 py-1 text-[9px] font-black border uppercase tracking-wider ninja-clip-xs ${sub.activo
                        ? 'bg-oro/10 text-oro border-oro/20'
                        : 'bg-black/60 text-oro/20 border-oro/5'
                      }`}>
                      {sub.activo ? 'ACTIVO' : 'ARCHIVADO'}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="py-5 px-8 text-right">
                    <div className="flex items-center justify-end gap-2.5">
                      <button
                        onClick={() => toggleActive(sub.id, sub.activo)}
                        className={`p-2.5 transition-all border ninja-clip-xs ${sub.activo
                            ? 'bg-oro/10 border-oro/20 text-oro hover:bg-oro hover:text-rojo-sangre'
                            : 'bg-black/40 border-oro/5 text-oro/20 hover:border-oro/40 hover:text-oro'
                          }`}
                        title={sub.activo ? "Archivar Sub-Especialidad" : "Activar Sub-Especialidad"}
                      >
                        {sub.activo ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => { setEditingId(sub.id); setEditForm({ ...sub }); }}
                        className="p-2.5 bg-oro text-rojo-sangre hover:brightness-110 transition-all active:scale-95 shadow-lg shadow-oro/10 ninja-clip-xs"
                        title="Editar Sub-Especialidad"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredSubs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-24 text-center">
                    <p className="text-oro/10 font-black uppercase italic tracking-[0.3em] text-xs">Sin resultados tácticos</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
