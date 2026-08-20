'use client';

import { useState, useEffect } from 'react';
import { RegistrosService } from '@/services/supabase/registros.service';
import { CharacterService } from '@/services/supabase/character.service';
import { MasterService } from '@/services/supabase/master.service';
import { Glosario, Registro, Rasgo, Aldea } from '@/domain/types';
import { useToastStore } from '@/components/ui/Toast';
import { useCharacterStore } from '@/store/useCharacterStore';
import { AdminService } from '@/services/supabase/admin.service';
import { X, Search, UserPlus, User, Trash2, Coins, Sparkles, Plus, BookOpen, Link as LinkIcon, Shield, Radio } from 'lucide-react';
import { searchIncludes } from '@/lib/utils/search';
import { NinjaSelect } from '@/components/ui/Fields';
import { renderDiscordMarkdown } from '@/lib/discord/renderDiscordMarkdown';

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

  // Channel & Discord fields
  const [aldeas, setAldeas] = useState<Aldea[]>([]);
  const [destinatarioTipo, setDestinatarioTipo] = useState<'global' | 'aldea' | 'organizacion'>(initialData?.data?.destinatario_tipo || 'global');
  const [destinatarioId, setDestinatarioId] = useState<number | null>(initialData?.data?.destinatario_id || null);
  const [discordMessageText, setDiscordMessageText] = useState<string>(initialData?.data?.discord_message_text || '');
  const [discordImageUrl, setDiscordImageUrl] = useState<string>(initialData?.data?.discord_image_url || '');

  // Rewards states (Global)
  const [globalXp, setGlobalXp] = useState<number>(Number(initialData?.data?.global_xp) || 0);
  const [globalRyous, setGlobalRyous] = useState<number>(Number(initialData?.data?.global_ryous) || 0);
  const [globalPa, setGlobalPa] = useState<number>(Number(initialData?.data?.global_pa) || 0);
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

  // Rasgos selection states
  const [allRasgos, setAllRasgos] = useState<Rasgo[]>([]);
  const [activeRasgoSelector, setActiveRasgoSelector] = useState<number | null>(null);
  const [rasgoSearchQuery, setRasgoSearchQuery] = useState('');

  useEffect(() => {
    if (!activeCharacter) {
      fetchActiveCharacter();
    }
    AdminService.getRasgos().then(data => {
      setAllRasgos(data.filter(r => r.activo !== false));
    }).catch(err => console.error('Error loading traits:', err));

    MasterService.getAldeas().then(data => {
      setAldeas(data);
    }).catch(err => console.error('Error loading aldeas:', err));
  }, []);

  // Load editing registry participants if editing
  useEffect(() => {
    if (initialData) {
      setNarrador(initialData.data?.narrador || '');
      setDestinatarioTipo(initialData.data?.destinatario_tipo || 'global');
      setDestinatarioId(initialData.data?.destinatario_id || null);
      setDiscordMessageText(initialData.data?.discord_message_text || '');
      setDiscordImageUrl(initialData.data?.discord_image_url || '');
      setGlobalXp(Number(initialData.data?.global_xp) || 0);
      setGlobalRyous(Number(initialData.data?.global_ryous) || 0);
      setGlobalPa(Number(initialData.data?.global_pa) || 0);
      setGlobalMonedasEvento(Number(initialData.data?.global_monedas_evento) || 0);
      setImages(initialData.data?.urls_imagenes || ['']);

      const initialParts = initialData.participantes?.map((p: any) => {
        const premio = initialData.data?.participantes_premios?.find((pr: any) => Number(pr.personaje_id) === Number(p.personaje_id));
        return {
          id: p.personaje_id,
          nombre_ninja: p.personaje?.nombre_ninja || 'Ninja Desaparecido',
          xp_extra: premio?.xp_extra || 0,
          ryous_extra: premio?.ryous_extra || 0,
          pa_extra: premio?.pa_extra || 0,
          monedas_evento: premio?.monedas_evento || 0,
          glosario_items: premio?.glosario_items || [],
          rasgos_items: premio?.rasgos_items || []
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
        pa_extra: 0,
        monedas_evento: 0,
        glosario_items: [],
        rasgos_items: []
      }));
      setParticipants(parts);
      parts.forEach(p => {
        loadValidGlosarioItems(p.id);
      });
    }
  }, [initialData?.id]);

  const loadValidGlosarioItems = async (personajeId: number) => {
    if (validGlosarioItems[personajeId]) return;
    setLoadingGlosario(prev => ({ ...prev, [personajeId]: true }));
    try {
      const items = await CharacterService.getValidItems(personajeId, undefined, true);
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
        pa_extra: 0,
        monedas_evento: 0,
        glosario_items: [],
        rasgos_items: []
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

  const addRasgoItemToParticipant = (personajeId: number, rasgo: Rasgo) => {
    setParticipants(participants.map(p => {
      if (p.id === personajeId) {
        const currentRasgos = p.rasgos_items || [];
        if (currentRasgos.find((r: any) => r.id === rasgo.id)) {
          addToast('Este personaje ya recibe este rasgo', 'error');
          return p;
        }
        return {
          ...p,
          rasgos_items: [...currentRasgos, { id: rasgo.id, nombre: rasgo.nombre, especial: rasgo.especial }]
        };
      }
      return p;
    }));
    setActiveRasgoSelector(null);
    setRasgoSearchQuery('');
  };

  const removeRasgoItemFromParticipant = (personajeId: number, rasgoId: number) => {
    setParticipants(participants.map(p => {
      if (p.id === personajeId) {
        return {
          ...p,
          rasgos_items: (p.rasgos_items || []).filter((r: any) => r.id !== rasgoId)
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
          titulo: narrador.trim() ? `Narrador: ${narrador.trim()}` : 'Narración',
          narrador: narrador.trim(),
          destinatario_tipo: destinatarioTipo,
          destinatario_id: destinatarioId,
          discord_message_text: discordMessageText.trim(),
          discord_image_url: discordImageUrl.trim(),
          global_xp: globalXp,
          global_ryous: globalRyous,
          global_pa: globalPa,
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
            pa_extra: Number(p.pa_extra) || 0,
            monedas_evento: Number(p.monedas_evento) || 0,
            glosario_items: p.glosario_items || [],
            rasgos_items: p.rasgos_items || []
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
          <div className="flex justify-between items-start border-b border-white pb-8">
            <div className="space-y-2">
              <h3 className="ninja-title text-2xl sm:text-4xl md:text-5xl text-oro">
                {initialData ? 'EDITAR REGISTRO NARRACIÓN' : 'REGISTRAR NARRACIÓN'}
              </h3>
              <p className="text-xs sm:text-sm font-black uppercase tracking-[0.4em]">Sincronizando con el archivo histórico de crónicas</p>
            </div>
            <button
              onClick={onCreated}
              className="group p-4 bg-black/40 border border-white hover:border-oro/40 transition-all ninja-clip-xs"
            >
              <X className="w-6 h-6 group-hover:text-oro" />
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 sm:gap-16">
            <div className="space-y-8 sm:space-y-10">
              {/* Narrador Field */}
              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-[0.3em] ml-2">Nombre del Narrador (Texto libre)</label>
                <input
                  type="text"
                  value={narrador}
                  onChange={(e) => setNarrador(e.target.value)}
                  placeholder="Ej: Staff / Nombre del Shinobi..."
                  className="w-full ninja-input py-4 text-sm"
                />
              </div>

              {/* Canal Destinatario (Discord) */}
              <div className="p-6 bg-black/40 border border-white ninja-clip-sm space-y-4">
                <span className="text-xs font-black uppercase tracking-[0.25em] block">Canal Discord</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-white/70 ml-1">Tipo de Canal</label>
                    <NinjaSelect
                      value={destinatarioTipo}
                      onChange={(val) => {
                        const v = val as 'global' | 'aldea' | 'organizacion';
                        setDestinatarioTipo(v);
                        if (v === 'global') setDestinatarioId(null);
                      }}
                      options={[
                        { label: 'CANAL GLOBAL DE NARRACIÓN', value: 'global' },
                        { label: 'ALDEA ESPECÍFICA', value: 'aldea' },
                        { label: 'ORGANIZACIÓN ESPECÍFICA', value: 'organizacion' }
                      ]}
                      variant="filter"
                    />
                  </div>

                  {destinatarioTipo !== 'global' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-white/70 ml-1">
                        {destinatarioTipo === 'aldea' ? 'Seleccionar Aldea' : 'Seleccionar Organización'}
                      </label>
                      <NinjaSelect
                        value={destinatarioId ? String(destinatarioId) : ''}
                        onChange={(val) => setDestinatarioId(val ? Number(val) : null)}
                        placeholder="-- SELECCIONAR --"
                        options={aldeas
                          .filter(a => destinatarioTipo === 'aldea' ? (a.categoria_id === 1 || !a.categoria_id) : a.categoria_id === 2)
                          .map(a => ({
                            label: (a.nombre_español || a.nombre_jap).toUpperCase(),
                            value: String(a.id)
                          }))
                        }
                        variant="filter"
                      />
                    </div>
                  )}
                </div>

                {/* Mensaje Markdown para Discord con Vista Previa en Tiempo Real */}
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-white/70">Aviso / Resumen en Markdown</label>
                    <span className={`text-xs font-mono font-bold ${discordMessageText.length > 4000 ? 'text-red-400 font-black animate-pulse' : 'text-white/40'}`}>
                      {discordMessageText.length} / 4000
                    </span>
                  </div>
                  <textarea
                    rows={5}
                    value={discordMessageText}
                    onChange={(e) => setDiscordMessageText(e.target.value)}
                    placeholder="Escribe el resumen del evento en Markdown para el Embed de Discord (**negrita**, *cursiva*, __subrayado__, `código`, listados, etc.)..."
                    className={`w-full ninja-input py-3 text-xs font-mono normal-case placeholder:normal-case ${discordMessageText.length > 4000 ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  {discordMessageText.length > 4000 && (
                    <p className="text-[11px] text-red-400 font-bold ml-1">
                      ⚠️ El mensaje supera los 4.000 caracteres recomendados para Embeds y podría recortarse en Discord.
                    </p>
                  )}

                  {/* Imagen Banner para Discord Embed */}
                  <div className="space-y-2 pt-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-white/70 ml-1">Imagen Banner para Discord Embed (URL Opcional)</label>
                    <div className="relative">
                      <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <input
                        type="text"
                        value={discordImageUrl}
                        onChange={(e) => setDiscordImageUrl(e.target.value)}
                        placeholder="HTTPS://..."
                        className="w-full ninja-input pl-12 py-3 text-xs font-bold"
                      />
                    </div>
                  </div>

                  {/* Vista Previa en Tiempo Real del Embed de Discord */}
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-oro flex items-center gap-2 ml-1">
                      <Radio className="w-3.5 h-3.5 animate-pulse text-oro" /> Vista Previa en Tiempo Real (Discord Embed)
                    </label>

                    <div className="bg-[#2b2d31] p-4 border-l-4 border-[#D6852D] font-sans space-y-3 shadow-2xl text-left rounded-r-md">
                      {/* Cabecera del Bot */}
                      <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                        <img
                          src="/assets/ui/logo.png"
                          alt="NRPG"
                          className="w-6 h-6 rounded-full object-cover border border-oro/30 shrink-0"
                        />
                        <span className="text-xs font-bold text-white">NRPG</span>
                        <span className="bg-[#5865f2] text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">BOT</span>
                        <span className="text-[10px] text-[#949ba4] ml-auto">HOY</span>
                      </div>

                      {/* Mención del Rol correspondiente */}
                      <div className="text-[11px] text-[#c9cdfb] font-semibold bg-[#5865f2]/20 border border-[#5865f2]/40 px-2 py-0.5 rounded w-fit flex items-center gap-1 my-1">
                        <span>
                          {destinatarioTipo === 'global'
                            ? '@Jugador'
                            : `@${aldeas.find(a => Number(a.id) === Number(destinatarioId))?.nombre_español || (destinatarioTipo === 'aldea' ? 'Rol de Aldea' : 'Rol de Organización')}`
                          }
                        </span>
                      </div>

                      {/* Cuerpo procesado con renderDiscordMarkdown */}
                      <div className="text-xs text-[#dbdee1] leading-relaxed prose prose-invert max-w-none break-words">
                        {discordMessageText.trim() ? (
                          renderDiscordMarkdown(discordMessageText)
                        ) : (
                          <span className="text-[#949ba4] italic select-none">
                            Escribe el cuerpo o resumen en el campo superior para ver la vista previa en tiempo real...
                          </span>
                        )}
                      </div>

                      {/* Imagen adjunta en el Embed si hay URL válida en discordImageUrl */}
                      {discordImageUrl.trim().startsWith('http') && (
                        <div className="rounded border border-white/10 overflow-hidden my-2 max-h-56 bg-black/40">
                          <img src={discordImageUrl.trim()} alt="Embed Media" className="w-full h-56 object-cover" />
                        </div>
                      )}

                      {/* Campo Enlace */}
                      <div className="pt-2 border-t border-white/5 space-y-1">
                        <span className="text-sm sm:text-base font-extrabold text-[#f2f3f5] flex items-center gap-2.5">
                          <img src="/assets/icons/naruto_scroll.png" alt="Scroll" className="w-7 h-7 object-contain shrink-0" />
                          Ver Registro y Recompensas
                        </span>
                        <span className="text-xs font-semibold text-[#00a8fc] underline block truncate">
                          https://nrpg.app/registros?id=preview
                        </span>
                      </div>

                      {/* Pie de Página Footer */}
                      <div className="text-[10px] text-[#949ba4] font-medium pt-1 flex flex-wrap justify-between items-center gap-2">
                        <span>Narrador: {narrador.trim() || 'Sistema'} • NRPG</span>
                        <span className="bg-black/30 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider text-oro/80 border border-white/5">
                          {destinatarioTipo === 'global'
                            ? '🌐 Canal Global'
                            : destinatarioTipo === 'aldea'
                              ? `🍃 ${aldeas.find(a => Number(a.id) === Number(destinatarioId))?.nombre_español || 'Aldea Especificada'}`
                              : `👥 ${aldeas.find(a => Number(a.id) === Number(destinatarioId))?.nombre_español || 'Organización Especificada'}`
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Premios Globales */}
              <div className="p-6 bg-black/40 border border-white ninja-clip-sm space-y-6">
                <span className="text-xs font-black uppercase tracking-[0.25em]  block">Recompensas Globales (Para todos)</span>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-caption font-black uppercase tracking-[0.2em]  flex items-center gap-1.5">
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
                    <label className="text-caption font-black uppercase tracking-[0.2em]  flex items-center gap-1.5">
                      RYOUS GLOBAL
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
                    <label className="text-caption font-black uppercase tracking-[0.2em]  flex items-center gap-1.5">
                      PA GLOBAL
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={globalPa}
                      onChange={(e) => setGlobalPa(Math.max(0, Number(e.target.value)))}
                      className="w-full ninja-input py-3 text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-caption font-black uppercase tracking-[0.2em]  flex items-center gap-1.5">
                      M. EVENTO
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
                <label className="text-xs font-black uppercase tracking-[0.25em]  ml-1">Buscar shinobi Participantes</label>
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
                <label className="text-xs font-black uppercase tracking-[0.3em]  ml-2">Pruebas del Evento (URLs)</label>
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
                          className="p-3 text-oro/20 hover:text-naranja-naruto transition-all"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setImages([...images, ''])}
                    className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.3em]  hover:text-oro transition-all ml-2 group"
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
          <div className="space-y-6 pt-4 border-t border-white">
            <h4 className="text-xs font-black uppercase tracking-[0.25em] ">
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
                    <div key={p.id} className="p-6 bg-black/50 border border-white hover:border-oro/30 transition-all ninja-clip-sm space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
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
                          className="p-2 hover:bg-naranja-naruto/20 text-oro/30 hover:text-naranja-naruto transition-all ninja-clip-xs"
                          title="Quitar Participante"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <label className="text-caption font-black uppercase tracking-widest  ml-1">EXP EXTRA</label>
                          <input
                            type="number"
                            min="0"
                            value={p.xp_extra}
                            onChange={(e) => updateParticipantField(p.id, 'xp_extra', Math.max(0, Number(e.target.value)))}
                            className="w-full ninja-input py-3 text-xs"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-caption font-black uppercase tracking-widest  ml-1">RYOUS EXTRA</label>
                          <input
                            type="number"
                            min="0"
                            value={p.ryous_extra}
                            onChange={(e) => updateParticipantField(p.id, 'ryous_extra', Math.max(0, Number(e.target.value)))}
                            className="w-full ninja-input py-3 text-xs"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-caption font-black uppercase tracking-widest  ml-1">PA EXTRA</label>
                          <input
                            type="number"
                            min="0"
                            value={p.pa_extra}
                            onChange={(e) => updateParticipantField(p.id, 'pa_extra', Math.max(0, Number(e.target.value)))}
                            className="w-full ninja-input py-3 text-xs"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-caption font-black uppercase tracking-widest  ml-1">MONEDAS EVENTO</label>
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
                        <label className="text-caption font-black uppercase tracking-widest  ml-1 flex items-center gap-1.5">
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
                                className="text-naranja-naruto/60 hover:text-naranja-naruto transition-all"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          ))}

                          <button
                            onClick={() => {
                              setActiveGlosarioSelector(activeGlosarioSelector === p.id ? null : p.id);
                              setActiveRasgoSelector(null);
                              setGlosarioSearchQuery('');
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-oro/5 hover:bg-oro hover:text-naranja-naruto border border-oro/15 hover:border-oro text-caption font-black text-oro uppercase tracking-wider transition-all ninja-clip-xs"
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
                                <span className="text-caption font-black uppercase  animate-pulse">Cargando ítems disponibles...</span>
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

                      {/* Rasgos Especiales del Personaje */}
                      <div className="space-y-3 pt-2 border-t border-oro/5">
                        <label className="text-caption font-black uppercase tracking-widest  ml-1 flex items-center gap-1.5">
                          Rasgos Especiales / Concedidos
                        </label>

                        <div className="flex flex-wrap gap-2.5 items-center">
                          {p.rasgos_items?.map((rasgo: any) => (
                            <span
                              key={rasgo.id}
                              className={`inline-flex items-center gap-2 px-3 py-1.5 border text-caption font-black uppercase tracking-wider ninja-clip-xs ${rasgo.especial ? 'bg-purple-950/40 border-purple-500/40 text-purple-300' : 'bg-amber-950/40 border-amber-500/40 text-amber-300'}`}
                            >
                              {rasgo.especial && <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1 py-0.5 rounded">ESPECIAL</span>}
                              {rasgo.nombre}
                              <button
                                onClick={() => removeRasgoItemFromParticipant(p.id, rasgo.id)}
                                className="text-naranja-naruto/60 hover:text-naranja-naruto transition-all"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          ))}

                          <button
                            onClick={() => {
                              setActiveRasgoSelector(activeRasgoSelector === p.id ? null : p.id);
                              setActiveGlosarioSelector(null);
                              setRasgoSearchQuery('');
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-oro/5 hover:bg-oro hover:text-naranja-naruto border border-oro/15 hover:border-oro text-caption font-black text-oro uppercase tracking-wider transition-all ninja-clip-xs"
                          >
                            <Plus className="w-3.5 h-3.5" /> Conceder Rasgo
                          </button>
                        </div>

                        {/* Dropdown del Selector de Rasgos */}
                        {activeRasgoSelector === p.id && (
                          <div className="mt-3 p-4 bg-neutral-800 border border-amber-500/30 space-y-4 animate-in zoom-in-95 duration-200">
                            <input
                              type="text"
                              placeholder="BUSCAR RASGO O RASGO ESPECIAL..."
                              value={rasgoSearchQuery}
                              onChange={(e) => setRasgoSearchQuery(e.target.value)}
                              className="w-full ninja-input py-2.5 px-4 text-xs font-black"
                            />

                            <div className="max-h-48 overflow-y-auto custom-scrollbar divide-y divide-oro/5">
                              {allRasgos
                                .filter(r => searchIncludes(r.nombre, rasgoSearchQuery))
                                .map((rasgo) => (
                                  <button
                                    key={rasgo.id}
                                    onClick={() => addRasgoItemToParticipant(p.id, rasgo)}
                                    className="w-full text-left py-3 px-4 hover:bg-amber-500/10 text-xs font-black text-oro/70 hover:text-amber-400 flex justify-between items-center uppercase tracking-widest border-b border-oro/5 last:border-0"
                                  >
                                    <span className="flex items-center gap-2">
                                      {rasgo.especial && <span className="text-[9px] bg-purple-950 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded font-black">ESPECIAL</span>}
                                      {rasgo.nombre}
                                    </span>
                                    <span className="text-caption font-bold ">{rasgo.categoria} ({rasgo.rango})</span>
                                  </button>
                                ))}

                              {allRasgos.filter(r => searchIncludes(r.nombre, rasgoSearchQuery)).length === 0 && (
                                <div className="text-center py-6">
                                  <p className="text-caption font-black uppercase text-oro/20 italic">No se encontraron rasgos</p>
                                </div>
                              )}
                            </div>
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
