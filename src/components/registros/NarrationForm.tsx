'use client';

import { useState, useEffect } from 'react';
import { RegistrosService } from '@/services/supabase/registros.service';
import { CharacterService } from '@/services/supabase/character.service';
import { Glosario, Registro } from '@/domain/types';
import { useToastStore } from '@/components/ui/Toast';
import { useCharacterStore } from '@/store/useCharacterStore';
import { X, Search, UserPlus, User, Trash2, Coins, Sparkles, Plus, BookOpen, Link as LinkIcon } from 'lucide-react';
import { searchIncludes } from '@/lib/utils/search';

interface NarrationFormProps {
  onCreated: () => void;
  initialData?: Registro | null;
  initialParticipants?: { id: number; nombre_ninja: string }[];
}

export default function NarrationForm({ onCreated, initialData = null, initialParticipants = [] }: NarrationFormProps) {
  const { activeCharacter, fetchActiveCharacter } = useCharacterStore();
  const addToast = useToastStore(state => state.addToast);
  const [loading, setLoading] = useState(false);

  // General fields
  const [narrador, setNarrador] = useState(initialData?.data?.narrador || '');
  const [images, setImages] = useState<string[]>(initialData?.data?.urls_imagenes || ['']);

  // Rewards states (Global)
  const [globalXp, setGlobalXp] = useState<number>(Number(initialData?.data?.global_xp) || 0);
  const [globalRyous, setGlobalRyous] = useState<number>(Number(initialData?.data?.global_ryous) || 0);
  const [globalMonedasEvento, setGlobalMonedasEvento] = useState<number>(Number(initialData?.data?.global_monedas_evento) || 0);

  // Participants & Rewards
  const [participants, setParticipants] = useState<any[]>([]);
  const [participantSearch, setParticipantSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Glosario selection states per user
  const [validGlosarioItems, setValidGlosarioItems] = useState<Record<number, Glosario[]>>({});
  const [loadingGlosario, setLoadingGlosario] = useState<Record<number, boolean>>({});
  const [activeGlosarioSelector, setActiveGlosarioSelector] = useState<number | null>(null);
  const [glosarioSearchQuery, setGlosarioSearchQuery] = useState('');

  useEffect(() => {
    if (!activeCharacter) {
      fetchActiveCharacter();
    }
  }, []);

  // Load editing registry participants if editing
  useEffect(() => {
    if (initialData) {
      setNarrador(initialData.data?.narrador || '');
      setGlobalXp(Number(initialData.data?.global_xp) || 0);
      setGlobalRyous(Number(initialData.data?.global_ryous) || 0);
      setGlobalMonedasEvento(Number(initialData.data?.global_monedas_evento) || 0);
      setImages(initialData.data?.urls_imagenes || ['']);

      const initialParts = initialData.participantes?.map((p: any) => {
        const premio = initialData.data?.participantes_premios?.find((pr: any) => Number(pr.personaje_id) === Number(p.personaje_id));
        return {
          id: p.personaje_id,
          nombre_ninja: p.personaje?.nombre_ninja || 'Ninja Desaparecido',
          xp_extra: premio?.xp_extra || 0,
          ryous_extra: premio?.ryous_extra || 0,
          monedas_evento: premio?.monedas_evento || 0,
          glosario_items: premio?.glosario_items || []
        };
      }) || [];
      setParticipants(initialParts);

      // Fetch valid glosario items for initial participants
      initialParts.forEach(p => {
        loadValidGlosarioItems(p.id);
      });
    } else if (initialParticipants && initialParticipants.length > 0) {
      const parts = initialParticipants.map(p => ({
        id: p.id,
        nombre_ninja: p.nombre_ninja,
        xp_extra: 0,
        ryous_extra: 0,
        monedas_evento: 0,
        glosario_items: []
      }));
      setParticipants(parts);
      parts.forEach(p => {
        loadValidGlosarioItems(p.id);
      });
    } else if (activeCharacter) {
      // Add author automatically as participant
      addParticipant({
        id: activeCharacter.id,
        nombre_ninja: activeCharacter.nombre_ninja
      });
    }
  }, [initialData, activeCharacter?.id, initialParticipants]);

  const loadValidGlosarioItems = async (personajeId: number) => {
    if (validGlosarioItems[personajeId]) return;
    setLoadingGlosario(prev => ({ ...prev, [personajeId]: true }));
    try {
      const items = await CharacterService.getValidItems(personajeId);
      setValidGlosarioItems(prev => ({ ...prev, [personajeId]: items }));
    } catch (err) {
      console.error(`Error loading glosario for ${personajeId}:`, err);
    } finally {
      setLoadingGlosario(prev => ({ ...prev, [personajeId]: false }));
    }
  };

  const handleSearchParticipants = async (query: string) => {
    setParticipantSearch(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await RegistrosService.searchCharacters(query);
      setSearchResults(results.filter(r =>
        !participants.find(p => Number(p.id) === Number(r.id))
      ));
    } catch (err) {
      console.error(err);
    }
  };

  const addParticipant = (p: { id: number; nombre_ninja: string }) => {
    if (participants.find(part => Number(part.id) === Number(p.id))) return;
    setParticipants([
      ...participants,
      {
        id: p.id,
        nombre_ninja: p.nombre_ninja,
        xp_extra: 0,
        ryous_extra: 0,
        monedas_evento: 0,
        glosario_items: []
      }
    ]);
    loadValidGlosarioItems(p.id);
    setParticipantSearch('');
    setSearchResults([]);
  };

  const removeParticipant = (id: number) => {
    setParticipants(participants.filter(p => p.id !== id));
  };

  const updateParticipantField = (id: number, field: string, value: any) => {
    setParticipants(participants.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const addGlosarioItemToParticipant = (personajeId: number, item: Glosario) => {
    setParticipants(participants.map(p => {
      if (p.id === personajeId) {
        if (p.glosario_items.find((i: any) => i.id === item.id)) {
          addToast('Este personaje ya recibe este premio', 'error');
          return p;
        }
        return {
          ...p,
          glosario_items: [...p.glosario_items, { id: item.id, nombre_es: item.nombre_es, categoria_id: item.categoria_id }]
        };
      }
      return p;
    }));
    setActiveGlosarioSelector(null);
    setGlosarioSearchQuery('');
  };

  const removeGlosarioItemFromParticipant = (personajeId: number, itemId: number) => {
    setParticipants(participants.map(p => {
      if (p.id === personajeId) {
        return {
          ...p,
          glosario_items: p.glosario_items.filter((i: any) => i.id !== itemId)
        };
      }
      return p;
    }));
  };

  const handleSubmit = async () => {
    if (!activeCharacter) {
      addToast('No se ha detectado un personaje activo.', 'error');
      return;
    }
    if (!narrador.trim()) {
      addToast('Indica el nombre del narrador del evento', 'error');
      return;
    }
    if (participants.length === 0) {
      addToast('Añade al menos un participante para el registro', 'error');
      return;
    }

    const validImages = images.filter(img => img.trim() !== '');
    if (validImages.length === 0) {
      addToast('Añade al menos una prueba (URL)', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        tipo: 'accion' as const,
        subtipo: 'narracion',
        autor_id: activeCharacter.id,
        participantes_ids: participants.map(p => p.id),
        data: {
          titulo: `Evento de Narración: Narrador ${narrador}`,
          narrador: narrador.trim(),
          global_xp: globalXp,
          global_ryous: globalRyous,
          global_monedas_evento: globalMonedasEvento,
          urls_imagenes: validImages,
          participantes_historicos: participants.map(p => ({
            id: p.id,
            nombre_ninja: p.nombre_ninja
          })),
          participantes_premios: participants.map(p => ({
            personaje_id: p.id,
            nombre_ninja: p.nombre_ninja,
            xp_extra: Number(p.xp_extra) || 0,
            ryous_extra: Number(p.ryous_extra) || 0,
            monedas_evento: Number(p.monedas_evento) || 0,
            glosario_items: p.glosario_items
          }))
        }
      };

      if (initialData) {
        await RegistrosService.updateRegistro(initialData.id, payload as any);
        addToast('Registro de narración actualizado correctamente', 'success');
      } else {
        await RegistrosService.createRegistro(payload as any);
        addToast('Registro de narración publicado correctamente', 'success');
        fetchActiveCharacter(); // Sincronizar stats locales
      }
      onCreated();
    } catch (err: any) {
      addToast(err.message || 'Error al guardar el registro', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="ninja-card-oro p-8 sm:p-12 xl:p-16 relative overflow-hidden">
        {/* Background Decorative Element */}
        <div className="absolute top-0 right-0 p-10 opacity-[0.02] pointer-events-none">
          <img src="/assets/icons/shuriken.png" className="w-64 h-64 rotate-12" alt="bg" />
        </div>

        <div className="relative z-10 space-y-10 sm:space-y-14">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-oro/10 pb-8">
            <div className="space-y-2">
              <h3 className="ninja-title text-2xl sm:text-4xl md:text-5xl text-oro">
                {initialData ? 'EDITAR REGISTRO NARRACIÓN' : 'REGISTRAR NARRACIÓN'}
              </h3>
              <p className="text-xs sm:text-sm font-black text-oro/40 uppercase tracking-[0.4em]">Sincronizando con el archivo histórico de crónicas</p>
            </div>
            <button
              onClick={onCreated}
              className="group p-4 bg-black/40 border border-oro/10 hover:border-oro/40 transition-all ninja-clip-xs"
            >
              <X className="w-6 h-6 text-oro/40 group-hover:text-oro" />
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 sm:gap-16">
            <div className="space-y-8 sm:space-y-10">
              {/* Narrador Field */}
              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-[0.3em] text-oro/40 ml-2">Nombre del Narrador (Texto libre)</label>
                <input
                  type="text"
                  value={narrador}
                  onChange={(e) => setNarrador(e.target.value)}
                  placeholder="Ej: Staff / Nombre del Shinobi..."
                  className="w-full ninja-input py-4 text-sm"
                />
              </div>

              {/* Premios Globales */}
              <div className="p-6 bg-black/40 border border-oro/10 ninja-clip-sm space-y-6">
                <span className="text-xs font-black uppercase tracking-[0.25em] text-oro/50 block">Recompensas Globales (Para todos)</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-caption font-black uppercase tracking-[0.2em] text-oro/40 flex items-center gap-1.5">
                      EXP GLOBAL
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={globalXp}
                      onChange={(e) => setGlobalXp(Math.max(0, Number(e.target.value)))}
                      className="w-full ninja-input py-3 text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-caption font-black uppercase tracking-[0.2em] text-oro/40 flex items-center gap-1.5">
                      RYOUS GLOBALES
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={globalRyous}
                      onChange={(e) => setGlobalRyous(Math.max(0, Number(e.target.value)))}
                      className="w-full ninja-input py-3 text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-caption font-black uppercase tracking-[0.2em] text-oro/40 flex items-center gap-1.5">
                      MONEDA EVENTO
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={globalMonedasEvento}
                      onChange={(e) => setGlobalMonedasEvento(Math.max(0, Number(e.target.value)))}
                      className="w-full ninja-input py-3 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Buscador de Participantes */}
              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-[0.25em] text-oro/50 ml-1">Buscar Shinobis Participantes</label>
                <div className="relative">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-oro/20" />
                  <input
                    type="text"
                    value={participantSearch}
                    onChange={(e) => handleSearchParticipants(e.target.value)}
                    placeholder="BUSCAR SHINOBI POR NOMBRE..."
                    className="w-full ninja-input pl-16 py-4 text-xs font-black"
                  />
                </div>

                {searchResults.length > 0 && (
                  <div className="absolute z-50 w-[calc(100%-3rem)] sm:w-[calc(100%-4rem)] mt-2 bg-black border border-oro/20 shadow-[0_10px_35px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in duration-200">
                    {searchResults.map(p => (
                      <button
                        key={p.id}
                        onClick={() => addParticipant(p)}
                        className="w-full px-6 py-4 text-left text-xs font-black text-oro/60 hover:bg-oro/15 hover:text-oro flex items-center gap-3 border-b border-oro/5 last:border-0 uppercase tracking-widest transition-all"
                      >
                        <UserPlus className="w-4 h-4" /> {p.nombre_ninja} {p.hobba_name ? `(${p.hobba_name})` : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Columna Derecha: Imágenes y Botón Guardar */}
            <div className="space-y-8">
              {/* Pruebas */}
              <div className="space-y-6">
                <label className="text-xs font-black uppercase tracking-[0.3em] text-oro/40 ml-2">Pruebas del Evento (URLs)</label>
                <div className="space-y-4">
                  {images.map((img, i) => (
                    <div key={i} className="flex gap-4 group">
                      <div className="relative flex-1">
                        <LinkIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-oro/20" />
                        <input
                          value={img}
                          onChange={(e) => {
                            const newImgs = [...images];
                            newImgs[i] = e.target.value;
                            setImages(newImgs);
                          }}
                          placeholder="HTTPS://..."
                          className="w-full ninja-input pl-16 py-4 text-xs font-bold"
                        />
                      </div>
                      {images.length > 1 && (
                        <button
                          onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                          className="p-3 text-oro/20 hover:text-rojo-sangre transition-all"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setImages([...images, ''])}
                    className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.3em] text-oro/40 hover:text-oro transition-all ml-2 group"
                  >
                    <div className="w-6 h-[1px] bg-oro/20 group-hover:bg-oro transition-all" />
                    AÑADIR OTRO REGISTRO VISUAL
                  </button>
                </div>
              </div>

              <div className="pt-6">
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className={`w-full py-6 ninja-btn-oro text-lg uppercase tracking-widest font-black ${loading ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                >
                  {loading ? 'SELLANDO ARCHIVO...' : initialData ? 'ACTUALIZAR REGISTRO' : 'REGISTRAR EN EL ARCHIVO'}
                </button>
              </div>
            </div>
          </div>

          {/* Listado de Participantes con Premios Propios */}
          <div className="space-y-6 pt-4 border-t border-oro/10">
            <h4 className="text-xs font-black uppercase tracking-[0.25em] text-oro/40">
              Desglose Individual de Premios ({participants.length} Participantes)
            </h4>

            {participants.length === 0 ? (
              <div className="p-10 text-center bg-black/20 border border-oro/5 ninja-clip-sm">
                <p className="text-caption font-black uppercase tracking-widest text-oro/30 italic">Busca y añade ninjas arriba para configurar sus recompensas individuales</p>
              </div>
            ) : (
              <div className="space-y-6">
                {participants.map((p) => {
                  const isAuthor = Number(p.id) === Number(activeCharacter?.id);
                  return (
                    <div key={p.id} className="p-6 bg-black/50 border border-oro/10 hover:border-oro/30 transition-all ninja-clip-sm space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                      <div className="flex justify-between items-center border-b border-oro/5 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-oro/10 border border-oro/20 ninja-clip-xs">
                            <User className="w-4 h-4 text-oro/60" />
                          </div>
                          <span className="text-sm font-black text-oro uppercase tracking-wider">
                            {p.nombre_ninja} {isAuthor ? '(AUTOR - AUTO ACEPTADO)' : ''}
                          </span>
                        </div>
                        <button
                          onClick={() => removeParticipant(p.id)}
                          className="p-2 hover:bg-rojo-sangre/20 text-oro/30 hover:text-rojo-sangre transition-all ninja-clip-xs"
                          title="Quitar Participante"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label className="text-caption font-black uppercase tracking-widest text-oro/40 ml-1">EXP EXTRA INDEPENDIENTE</label>
                          <input
                            type="number"
                            min="0"
                            value={p.xp_extra}
                            onChange={(e) => updateParticipantField(p.id, 'xp_extra', Math.max(0, Number(e.target.value)))}
                            className="w-full ninja-input py-3 text-xs"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-caption font-black uppercase tracking-widest text-oro/40 ml-1">RYOUS EXTRA INDEPENDIENTES</label>
                          <input
                            type="number"
                            min="0"
                            value={p.ryous_extra}
                            onChange={(e) => updateParticipantField(p.id, 'ryous_extra', Math.max(0, Number(e.target.value)))}
                            className="w-full ninja-input py-3 text-xs"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-caption font-black uppercase tracking-widest text-oro/40 ml-1">MONEDAS EVENTO EXTRA</label>
                          <input
                            type="number"
                            min="0"
                            value={p.monedas_evento}
                            onChange={(e) => updateParticipantField(p.id, 'monedas_evento', Math.max(0, Number(e.target.value)))}
                            className="w-full ninja-input py-3 text-xs"
                          />
                        </div>
                      </div>

                      {/* Glosario Premios del Personaje */}
                      <div className="space-y-3 pt-2">
                        <label className="text-caption font-black uppercase tracking-widest text-oro/40 ml-1 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5" /> Objetos o Técnicas Especiales (Glosario)
                        </label>

                        <div className="flex flex-wrap gap-2.5 items-center">
                          {p.glosario_items?.map((item: any) => (
                            <span
                              key={item.id}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-900 border border-oro/25 text-caption font-black text-oro uppercase tracking-wider ninja-clip-xs"
                            >
                              {item.nombre_es}
                              <button
                                onClick={() => removeGlosarioItemFromParticipant(p.id, item.id)}
                                className="text-rojo-sangre/60 hover:text-rojo-sangre transition-all"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          ))}

                          <button
                            onClick={() => {
                              setActiveGlosarioSelector(activeGlosarioSelector === p.id ? null : p.id);
                              setGlosarioSearchQuery('');
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-oro/5 hover:bg-oro hover:text-rojo-sangre border border-oro/15 hover:border-oro text-caption font-black text-oro uppercase tracking-wider transition-all ninja-clip-xs"
                          >
                            <Plus className="w-3.5 h-3.5" /> Añadir Objeto/Técnica
                          </button>
                        </div>

                        {/* Dropdown del Selector de Glosario */}
                        {activeGlosarioSelector === p.id && (
                          <div className="mt-3 p-4 bg-neutral-800 border border-oro/20 space-y-4 animate-in zoom-in-95 duration-200">
                            <input
                              type="text"
                              placeholder="FILTRAR GLOSARIO..."
                              value={glosarioSearchQuery}
                              onChange={(e) => setGlosarioSearchQuery(e.target.value)}
                              className="w-full ninja-input py-2.5 px-4 text-xs font-black"
                            />

                            {loadingGlosario[p.id] ? (
                              <div className="flex items-center gap-2 py-4 justify-center">
                                <span className="text-caption font-black uppercase text-oro/40 animate-pulse">Cargando ítems disponibles...</span>
                              </div>
                            ) : (
                              <div className="max-h-48 overflow-y-auto custom-scrollbar divide-y divide-oro/5">
                                {(validGlosarioItems[p.id] || [])
                                  .filter(item => searchIncludes(item.nombre_es, glosarioSearchQuery))
                                  .map((item) => (
                                    <button
                                      key={item.id}
                                      onClick={() => addGlosarioItemToParticipant(p.id, item)}
                                      className="w-full text-left py-3 px-4 hover:bg-oro/10 text-xs font-black text-oro/60 hover:text-oro flex justify-between items-center uppercase tracking-widest border-b border-oro/5 last:border-0"
                                    >
                                      <span>{item.nombre_es}</span>
                                      <span className="text-caption font-bold text-oro/30">Cumple requisitos</span>
                                    </button>
                                  ))}

                                {(validGlosarioItems[p.id] || []).filter(item => searchIncludes(item.nombre_es, glosarioSearchQuery)).length === 0 && (
                                  <div className="text-center py-6">
                                    <p className="text-caption font-black uppercase text-oro/20 italic">No hay ítems válidos para los requisitos de este personaje</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
