'use client';

import { useState, useEffect } from 'react';
import { Save, X, GitBranch, AlignLeft, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AdminService } from '@/services/supabase/admin.service';
import { MasterService } from '@/services/supabase/master.service';
import { useToastStore } from '@/components/ui/Toast';
import { DataField, SearchableSelect } from '@/components/ui/Fields';
import { RamaClan, Aldea, Glosario, SubEspecialidad, Elemento } from '@/domain/types';

interface RamaEditFormProps {
  rama?: RamaClan;
  aldeas: Aldea[];
  rasgos: any[];
  onCancel: () => void;
}

const generateSlug = (name: string) => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
};

export default function RamaEditForm({ rama, aldeas, rasgos, onCancel }: RamaEditFormProps) {
  const isCreate = !rama;
  const [isSlugEdited, setIsSlugEdited] = useState(false);
  const [formData, setFormData] = useState<Partial<RamaClan>>(() => {
    if (rama) {
      return {
        ...rama,
        es_especial: rama.es_especial ?? false,
        es_repetible: rama.es_repetible ?? false,
        rasgo_id: rama.rasgo_id ?? null,
        config_iniciales: rama.config_iniciales ?? { opciones: [] }
      };
    }
    return {
      nombre: '',
      slug: '',
      descripcion: '',
      tipo: 'rama',
      aldea_id: undefined,
      activo: true,
      es_especial: false,
      es_repetible: false,
      url_imagen: '',
      rasgo_id: null,
      config_iniciales: { opciones: [] }
    };
  });
  const [glosario, setGlosario] = useState<Glosario[]>([]);
  const [ramasActivas, setRamasActivas] = useState<RamaClan[]>([]);
  const [subEsps, setSubEsps] = useState<SubEspecialidad[]>([]);
  const [elementos, setElementos] = useState<Elemento[]>([]);
  useEffect(() => {
    Promise.all([
      MasterService.getGlosarios({ categoriaId: 1 }),
      MasterService.getAdminRamasActivas(),
      MasterService.getSubEspecialidades(),
      MasterService.getElementos()
    ]).then(([glos, ramas, subs, elems]) => {
      setGlosario(glos);
      setRamasActivas(ramas);
      setSubEsps(subs);
      setElementos(elems);
    }).catch(console.error);
  }, []);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const addToast = useToastStore(state => state.addToast);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        slug: generateSlug(formData.slug || formData.nombre || '')
      };

      await AdminService.saveRamaClan(payload);
      addToast(`${formData.tipo === 'rama' ? 'Rama' : 'Clan'} ${isCreate ? 'creada' : 'actualizada'} con éxito`, 'success');
      router.refresh();
      onCancel();
    } catch (error: any) {
      addToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof RamaClan, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-start sm:items-center justify-center p-4 sm:p-6 xl:p-12 overflow-y-auto">
      <div
        className="relative w-full max-w-3xl ninja-card-oro p-6 sm:p-10 xl:p-12 my-auto animate-in fade-in zoom-in duration-300"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-oro/5 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none" />

        <header className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-10 relative z-10">
          <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-4">
            <div className="p-4 border border-oro/20 bg-oro/10 text-oro ninja-clip-sm shrink-0">
              <GitBranch className="w-6 h-6" />
            </div>
            <div>
              <h2 className="ninja-title text-xl sm:text-3xl leading-none">
                {isCreate ? (formData.tipo === 'rama' ? 'CREAR NUEVA RAMA' : 'CREAR NUEVO CLAN') : 'EDITAR REGISTRO'}
              </h2>
              <p className="text-caption font-black text-oro/40 uppercase tracking-[0.2em] mt-2 italic">Configuración de especialidades ninja</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <label className="flex items-center gap-3 cursor-pointer group bg-oro/5 px-4 py-2 border border-oro/10 hover:border-oro/30 transition-all">
              <span className={`text-caption font-black uppercase tracking-widest transition-colors ${formData.activo ? 'text-oro' : 'text-oro/20'}`}>
                {formData.activo ? 'ACTIVO' : 'INACTIVO'}
              </span>
              <input
                type="checkbox"
                checked={formData.activo}
                onChange={(e) => updateField('activo', e.target.checked)}
                className="hidden"
              />
              <div className={`w-8 h-4 rounded-none transition-all relative ${formData.activo ? 'bg-oro/20 border-oro/40' : 'bg-black/40 border-oro/10'} border`}>
                <div className={`absolute top-[2px] w-2.5 h-2.5 transition-all ${formData.activo ? 'right-[2px] bg-oro shadow-[0_0_10px_rgba(255,230,159,0.5)]' : 'left-[2px] bg-oro/10'}`} />
              </div>
            </label>
            <button onClick={onCancel} className="p-2 text-oro/40 hover:text-rojo-sangre transition-all hover:rotate-90">
              <X className="w-8 h-8" />
            </button>
          </div>
        </header>

        <form onSubmit={handleSave} className="space-y-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <DataField
              label="Nombre"
              value={formData.nombre}
              onChange={(v) => {
                updateField('nombre', v);
                if (!isSlugEdited && isCreate) {
                  updateField('slug', generateSlug(v));
                }
              }}
              placeholder="Ej: Clan Uchiha"
            />
            <DataField
              label="Slug (URL)"
              value={formData.slug}
              onChange={(v) => {
                setIsSlugEdited(true);
                updateField('slug', generateSlug(v));
              }}
              placeholder="clan-uchiha"
            />
            <SearchableSelect
              label="Aldea Asociada"
              value={formData.aldea_id}
              options={aldeas.map(a => ({ label: a.nombre_completo, value: a.id }))}
              onChange={(v) => updateField('aldea_id', v ? Number(v) : null)}
              placeholder="Cualquier Aldea / Ronin"
            />
            <div className="space-y-2">
              <label className="text-caption font-black uppercase tracking-widest text-oro/60 ml-1">Tipo de Registro</label>
              <div className="flex bg-black/40 p-1 border border-oro/10 h-[58px] ninja-clip-sm">
                <button
                  type="button"
                  onClick={() => {
                    updateField('tipo', 'rama');
                    updateField('es_especial', false);
                  }}
                  className={`flex-1 text-caption font-black uppercase tracking-widest transition-all ninja-clip-xs ${formData.tipo === 'rama' ? 'bg-oro text-rojo-sangre shadow-lg' : 'text-oro/40 hover:text-oro hover:bg-oro/5'}`}
                >
                  Rama
                </button>
                <button
                  type="button"
                  onClick={() => updateField('tipo', 'clan')}
                  className={`flex-1 text-caption font-black uppercase tracking-widest transition-all ninja-clip-xs ${formData.tipo === 'clan' ? 'bg-oro text-rojo-sangre shadow-lg' : 'text-oro/40 hover:text-oro hover:bg-oro/5'}`}
                >
                  Clan
                </button>
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-caption font-black uppercase tracking-widest text-oro/60 ml-1">Repetibilidad</label>
              <div className="flex bg-black/40 p-4 border border-oro/10 justify-between items-center h-[58px] ninja-clip-sm">
                <span className="text-[11px] font-black uppercase tracking-widest text-oro/40">
                  ¿Es Rama Repetible en slots del personaje?
                </span>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <span className={`text-caption font-black uppercase tracking-widest transition-colors ${formData.es_repetible ? 'text-oro' : 'text-oro/20'}`}>
                    {formData.es_repetible ? 'SÍ' : 'NO'}
                  </span>
                  <input
                    type="checkbox"
                    checked={formData.es_repetible}
                    onChange={(e) => updateField('es_repetible', e.target.checked)}
                    className="hidden"
                  />
                  <div className={`w-8 h-4 rounded-none transition-all relative ${formData.es_repetible ? 'bg-oro/20 border-oro/40' : 'bg-black/40 border-oro/10'} border`}>
                    <div className={`absolute top-[2px] w-2.5 h-2.5 transition-all ${formData.es_repetible ? 'right-[2px] bg-oro shadow-[0_0_10px_rgba(255,230,159,0.5)]' : 'left-[2px] bg-oro/10'}`} />
                  </div>
                </label>
              </div>
            </div>
            {formData.tipo === 'clan' && (
              <div className="space-y-2 md:col-span-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="text-caption font-black uppercase tracking-widest text-oro/60 ml-1">Estatus del Clan</label>
                <div className="flex bg-black/40 p-4 border border-oro/10 justify-between items-center h-[58px] ninja-clip-sm">
                  <span className="text-[11px] font-black uppercase tracking-widest text-oro/40">
                    Clan Especial (Límites reducidos)
                  </span>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <span className={`text-caption font-black uppercase tracking-widest transition-colors ${formData.es_especial ? 'text-oro' : 'text-oro/20'}`}>
                      {formData.es_especial ? 'SÍ' : 'NO'}
                    </span>
                    <input
                      type="checkbox"
                      checked={formData.es_especial}
                      onChange={(e) => updateField('es_especial', e.target.checked)}
                      className="hidden"
                    />
                    <div className={`w-8 h-4 rounded-none transition-all relative ${formData.es_especial ? 'bg-oro/20 border-oro/40' : 'bg-black/40 border-oro/10'} border`}>
                      <div className={`absolute top-[2px] w-2.5 h-2.5 transition-all ${formData.es_especial ? 'right-[2px] bg-oro shadow-[0_0_10px_rgba(255,230,159,0.5)]' : 'left-[2px] bg-oro/10'}`} />
                    </div>
                  </label>
                </div>
              </div>
            )}
            <div className="md:col-span-2">
              <SearchableSelect
                label="Rasgo Automático Vinculado"
                value={formData.rasgo_id}
                options={rasgos.map(r => ({ label: r.nombre, value: r.id }))}
                onChange={(v) => updateField('rasgo_id', v ? Number(v) : null)}
                placeholder="Ningún Rasgo Asignado"
              />
            </div>
            <div className="md:col-span-2">
              <DataField
                label="URL Imagen"
                value={formData.url_imagen}
                onChange={(v) => updateField('url_imagen', v)}
                placeholder="https://ejemplo.com/imagen.jpg"
              />
            </div>
            {formData.tipo === 'clan' && (
              <div className="space-y-6 md:col-span-2 border-t border-oro/10 pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-black text-oro uppercase tracking-[0.2em]">Técnicas Iniciales Opcionales del Clan</h3>
                    <p className="text-[11px] text-oro/40 font-bold uppercase mt-1">
                      Cada opción se vincula a una rama o subcategoría real. El jugador elige una al crear el personaje.
                    </p>
                    <div className="flex items-center gap-3 mt-4">
                      <input
                        type="checkbox"
                        id="clan_elemental"
                        checked={formData.config_iniciales?.clan_elemental === true}
                        onChange={(e) => {
                          const currentConfig = formData.config_iniciales || {};
                          updateField('config_iniciales', {
                            ...currentConfig,
                            clan_elemental: e.target.checked
                          });
                        }}
                        className="w-4 h-4 rounded border-oro/20 bg-black text-oro focus:ring-oro"
                      />
                      <label htmlFor="clan_elemental" className="text-xs font-black text-oro uppercase tracking-wider select-none cursor-pointer">
                        ¿Es un Clan Elemental? (El jugador elige entre Nin II o III y las técnicas son aprendibles)
                      </label>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const current = formData.config_iniciales?.opciones || [];
                      updateField('config_iniciales', {
                        ...formData.config_iniciales,
                        opciones: [...current, { rama_id: undefined, sub_especialidad_id: undefined, tecnicas_ids: [] }]
                      });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-oro/5 hover:bg-oro/10 border border-oro/20 hover:border-oro/30 text-oro text-[11px] font-black uppercase tracking-widest transition-all"
                  >
                    + Añadir Opción
                  </button>
                </div>
        <div className="space-y-6">
                  {formData.config_iniciales?.opciones?.map((opt, oIdx) => {
                    const ramaElegida = ramasActivas.find(r => r.id === opt.rama_id);
                    const subElegida = subEsps.find(s => s.id === opt.sub_especialidad_id);
                    const subOpts = opt.rama_id
                      ? subEsps.filter(s => {
                          if (s.rama_id !== opt.rama_id) return false;
                          if (Number(opt.rama_id) === 4) {
                            const isElemental = formData.config_iniciales?.clan_elemental === true;
                            const isNinIIorIII = s.slug === 'ninjutsu-ii' || s.slug === 'ninjutsu-iii';
                            return isElemental ? isNinIIorIII : !s.slug?.toLowerCase().startsWith('ninjutsu-');
                          }
                          return true;
                        })
                      : [];
                    const optLabel = subElegida
                      ? `${ramaElegida?.nombre || '?'} › ${subElegida.nombre}`
                      : ramaElegida?.nombre || 'Sin configurar';

                    return (
                      <div key={oIdx} className="bg-black/20 p-6 border border-oro/10 space-y-4">
                        <div className="flex justify-between items-center gap-4">
                          <span className="text-xs font-black text-oro uppercase tracking-widest">
                            Opción {oIdx + 1}: <span className="text-oro/60">{optLabel}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const newOpciones = (formData.config_iniciales?.opciones || []).filter((_, idx) => idx !== oIdx);
                              updateField('config_iniciales', { ...formData.config_iniciales, opciones: newOpciones });
                            }}
                            className="text-rojo-sangre hover:text-white text-[11px] font-black uppercase tracking-widest px-3 py-1.5 border border-rojo-sangre/20 hover:bg-rojo-sangre/10 transition-all"
                          >
                            Eliminar
                          </button>
                        </div>

                        {/* Selector de Rama */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[11px] font-black uppercase tracking-widest text-oro/40">Rama / Clan</label>
                            <SearchableSelect
                              label=""
                              value={opt.rama_id ?? ''}
                              options={ramasActivas.map(r => ({ label: r.nombre, value: r.id }))}
                              onChange={(v) => {
                                 const newOpciones = [...(formData.config_iniciales?.opciones || [])];
                                 newOpciones[oIdx] = { ...newOpciones[oIdx], rama_id: v ? Number(v) : undefined, sub_especialidad_id: undefined };
                                 updateField('config_iniciales', { ...formData.config_iniciales, opciones: newOpciones });
                               }}
                              placeholder="Seleccionar rama..."
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-black uppercase tracking-widest text-oro/40">Subcategoría (opcional)</label>
                            <SearchableSelect
                              label=""
                              value={opt.sub_especialidad_id ?? ''}
                              options={subOpts.map(s => ({ label: s.nombre, value: s.id }))}
                              onChange={(v) => {
                                 const newOpciones = [...(formData.config_iniciales?.opciones || [])];
                                 newOpciones[oIdx] = { ...newOpciones[oIdx], sub_especialidad_id: v ? Number(v) : undefined };
                                 updateField('config_iniciales', { ...formData.config_iniciales, opciones: newOpciones });
                               }}
                              placeholder={opt.rama_id ? 'Toda la rama (sin subcategoría)' : 'Elige primero una rama'}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[11px] font-black uppercase tracking-widest text-oro/40">Técnicas en esta opción</label>
                          <div className="flex flex-wrap gap-2">
                            {opt.tecnicas_ids.map((tid) => {
                              const tec = glosario.find(t => t.id === tid);
                              return (
                                <div key={tid} className="flex items-center gap-2 bg-black/40 border border-oro/10 px-3 py-1.5 text-xs text-oro">
                                  <span>{tec ? tec.nombre_es : `ID: ${tid}`}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                       const newOpciones = [...(formData.config_iniciales?.opciones || [])];
                                       newOpciones[oIdx] = {
                                         ...newOpciones[oIdx],
                                         tecnicas_ids: newOpciones[oIdx].tecnicas_ids.filter(id => id !== tid)
                                       };
                                       updateField('config_iniciales', { ...formData.config_iniciales, opciones: newOpciones });
                                     }}
                                    className="text-rojo-sangre hover:text-white font-bold ml-1"
                                  >
                                    ×
                                  </button>
                                </div>
                              );
                            })}
                            {opt.tecnicas_ids.length === 0 && (
                              <span className="text-oro/20 text-xs italic">Ninguna técnica agregada</span>
                            )}
                          </div>
                        </div>

                        <div className="w-full">
                          {!opt.rama_id ? (
                            <p className="text-[11px] font-black uppercase tracking-widest text-oro/30 italic py-2">
                              Elige primero una rama para filtrar las técnicas disponibles.
                            </p>
                          ) : (
                            <SearchableSelect
                              label="Agregar Técnica"
                              value=""
                              options={glosario
                                .filter(t => {
                                  if (opt.tecnicas_ids.includes(t.id)) return false;
                                  if (t.rama_clan_id !== opt.rama_id) return false;
                                  if (opt.rama_id === 4 && opt.sub_especialidad_id) {
                                    const sub = subEsps.find(s => s.id === Number(opt.sub_especialidad_id));
                                    if (sub) {
                                      const elem = elementos.find((el: any) =>
                                        sub.slug?.toLowerCase() === el.nombre_jap?.toLowerCase() ||
                                        sub.nombre?.toLowerCase() === el.nombre_esp?.toLowerCase() ||
                                        sub.nombre?.toLowerCase() === el.nombre_jap?.toLowerCase()
                                      );
                                      if (elem) {
                                        return Number(t.elemento_id) === Number(elem.id);
                                      }
                                    }
                                  }
                                  const tSubId = t.sub_especialidad_id ? Number(t.sub_especialidad_id) : null;
                                  const optSubId = opt.sub_especialidad_id ? Number(opt.sub_especialidad_id) : null;
                                  if (tSubId !== optSubId) return false;
                                  return true;
                                })
                                .map(t => ({ label: `${t.nombre_es}${t.basica ? '' : ' ▲'}`, value: t.id }))}
                              onChange={(v) => {
                                if (!v) return;
                                const tId = Number(v);
                                 const newOpciones = [...(formData.config_iniciales?.opciones || [])];
                                 newOpciones[oIdx] = {
                                   ...newOpciones[oIdx],
                                   tecnicas_ids: [...newOpciones[oIdx].tecnicas_ids, tId]
                                 };
                                 updateField('config_iniciales', { ...formData.config_iniciales, opciones: newOpciones });
                               }}
                              placeholder="Buscar técnica de la rama..."
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-caption font-black uppercase tracking-widest text-oro/60 ml-1 flex items-center gap-2">
              <AlignLeft className="w-4 h-4 text-oro/60" /> Descripción / Lore
            </label>
            <textarea
              rows={4}
              value={formData.descripcion || ''}
              onChange={(e) => updateField('descripcion', e.target.value)}
              className="w-full bg-black/40 border border-oro/10 p-6 text-oro font-black outline-none focus:border-oro/40 transition-all placeholder:text-oro/10 text-sm md:text-base ninja-clip-sm"
              placeholder="Describe las habilidades únicas o historia..."
            />
          </div>

          <div className="flex justify-end gap-6 pt-10 border-t border-oro/10">
            <button
              type="button"
              onClick={onCancel}
              className="ninja-btn-ghost px-10 py-5 text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="ninja-btn-oro px-12 py-5 text-sm flex items-center justify-center gap-3"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Guardar {formData.tipo === 'rama' ? 'Rama' : 'Clan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
