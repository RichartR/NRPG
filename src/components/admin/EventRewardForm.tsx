'use client';

import { useState, useEffect, useRef } from 'react';
import { RegistrosService } from '@/services/supabase/registros.service';
import { CharacterService } from '@/services/supabase/character.service';
import { Glosario, Registro, Rasgo } from '@/domain/types';
import { SearchableMultiSelect } from '@/components/ui/Fields';
import { Portal } from '@/components/ui/Portal';
import { useToastStore } from '@/components/ui/Toast';
import { useCharacterStore } from '@/store/useCharacterStore';
import { AuthService } from '@/services/supabase/auth.service';
import { ProfileService } from '@/services/supabase/profile.service';
import { AdminService } from '@/services/supabase/admin.service';
import { X, Search, UserPlus, User, Trash2, Coins, Sparkles, Plus, BookOpen, Shield, MessageSquare, Image as ImageIcon, AtSign } from 'lucide-react';
import { searchIncludes } from '@/lib/utils/search';
import { renderDiscordMarkdown } from '@/lib/discord/renderDiscordMarkdown';

interface EventRewardFormProps {
  activeNews: {
    id?: string;
    discord_msg_id: string;
    titulo: string;
    categoria: string;
    url_imagen?: string;
  };
  editingRegistry?: Registro | null;
  onClose: () => void;
}

export default function EventRewardForm({ activeNews, editingRegistry, onClose }: EventRewardFormProps) {
  const addToast = useToastStore(state => state.addToast);
  const { activeCharacter } = useCharacterStore();
  const [loading, setLoading] = useState(false);
  const [adminProfile, setAdminProfile] = useState<any>(null);

  // Fetch admin profile if no active character
  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        const { data: { user } } = await AuthService.getUser();
        if (user) {
          const profile = await ProfileService.getProfile(user.id);
          setAdminProfile(profile);
        }
      } catch (err) {
        console.error('Error fetching admin profile:', err);
      }
    };
    if (!activeCharacter) {
      fetchAdminProfile();
    }
  }, [activeCharacter]);

  // Ping roles states
  const [discordRoles, setDiscordRoles] = useState<{ id: string; name: string }[]>([]);
  const [pingRoles, setPingRoles] = useState<string[]>(
    Array.isArray(editingRegistry?.data?.ping_roles) && editingRegistry.data.ping_roles.length > 0
      ? editingRegistry.data.ping_roles
      : ['default']
  );
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/admin/discord-roles')
      .then(res => res.json())
      .then(data => {
        if (data && data.roles) {
          setDiscordRoles(data.roles);
        }
      })
      .catch(err => console.error('Error fetching discord roles:', err));
  }, []);

  useEffect(() => {
    if (!roleDropdownOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (roleDropdownRef.current?.contains(e.target as Node)) return;
      setRoleDropdownOpen(false);
    };
    const handleClose = () => setRoleDropdownOpen(false);
    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('resize', handleClose);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('resize', handleClose);
    };
  }, [roleDropdownOpen]);

  const togglePingRole = (val: string) => {
    if (val === 'none') {
      setPingRoles(['none']);
      return;
    }
    setPingRoles(prev => {
      const filtered = prev.filter(r => r !== 'none');
      if (filtered.includes(val)) {
        const next = filtered.filter(r => r !== val);
        return next.length === 0 ? ['none'] : next;
      }
      return [...filtered, val];
    });
  };

  const allRoleOptions = [
    { value: 'default', label: '@Jugador (Por defecto)' },
    { value: 'everyone', label: '@everyone' },
    { value: 'here', label: '@here' },
    { value: 'none', label: 'Sin mención' },
    ...discordRoles.map(r => ({ value: r.id, label: `@${r.name}` }))
  ];

  const roleLabel = (val: string) => {
    const found = allRoleOptions.find(o => o.value === val);
    return found ? found.label : `@${val}`;
  };

  // Rewards states
  const [globalXp, setGlobalXp] = useState<number>(Number(editingRegistry?.data?.global_xp) || 0);
  const [globalRyous, setGlobalRyous] = useState<number>(Number(editingRegistry?.data?.global_ryous) || 0);
  const [globalPa, setGlobalPa] = useState<number>(Number(editingRegistry?.data?.global_pa) || 0);
  const [globalMonedasEvento, setGlobalMonedasEvento] = useState<number>(Number(editingRegistry?.data?.global_monedas_evento) || 0);
  const [textoEntrega, setTextoEntrega] = useState<string>(editingRegistry?.data?.texto_entrega || '');
  const [urlImagen, setUrlImagen] = useState<string>(editingRegistry?.data?.url_imagen || '');
  const [recuperable, setRecuperable] = useState<boolean>(editingRegistry ? editingRegistry.data?.recuperable !== false : true);

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
    AdminService.getRasgos().then(data => {
      setAllRasgos(data.filter(r => r.activo !== false));
    }).catch(err => console.error('Error loading traits:', err));
  }, []);

  // Load editing registry participants if editing
  useEffect(() => {
    if (editingRegistry) {
      setGlobalXp(Number(editingRegistry.data?.global_xp) || 0);
      setGlobalRyous(Number(editingRegistry.data?.global_ryous) || 0);
      setGlobalPa(Number(editingRegistry.data?.global_pa) || 0);
      setGlobalMonedasEvento(Number(editingRegistry.data?.global_monedas_evento) || 0);
      if (editingRegistry.data?.texto_entrega) {
        setTextoEntrega(editingRegistry.data.texto_entrega);
      } else if (editingRegistry.data?.discord_message_id) {
        fetch(`/api/discord/messages?messageId=${editingRegistry.data.discord_message_id}&categoria=evento`)
          .then(res => res.json())
          .then(data => {
            if (data && data.content) {
              setTextoEntrega(data.content);
            }
          })
          .catch(err => console.error('Error loading rewards text from Discord:', err));
      }
      setUrlImagen(editingRegistry.data?.url_imagen || '');

      const initialParts = editingRegistry.participantes?.map((p: any) => {
        const premio = editingRegistry.data?.participantes_premios?.find((pr: any) => Number(pr.personaje_id) === Number(p.personaje_id));
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
    }
  }, [editingRegistry]);

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
    if (!activeCharacter && !adminProfile) {
      addToast('No se ha detectado un personaje administrador activo ni cuenta administradora.', 'error');
      return;
    }
    if (participants.length === 0) {
      addToast('Añade al menos un participante para repartir premios', 'error');
      return;
    }
    if (textoEntrega.length > 1500) {
      addToast('La nota de entrega excede el límite de 1500 caracteres para Discord', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        tipo: 'accion' as const,
        subtipo: 'evento_premios',
        autor_id: activeCharacter ? activeCharacter.id : null,
        participantes_ids: participants.map(p => p.id),
        data: {
          titulo: `Reparto de Premios: ${activeNews.titulo}`,
          evento_id: activeNews.id,
          url_imagen: urlImagen.trim() || null,
          evento_url_imagen: activeNews.url_imagen || null,
          texto_entrega: textoEntrega.trim(),
          recuperable: recuperable,
          ping_roles: pingRoles,
          global_xp: globalXp,
          global_ryous: globalRyous,
          global_pa: globalPa,
          global_monedas_evento: globalMonedasEvento,
          autor_admin: !activeCharacter && adminProfile ? {
            id: adminProfile.id,
            username: adminProfile.username || 'Administrador'
          } : undefined,
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

      if (editingRegistry) {
        await RegistrosService.updateRegistro(editingRegistry.id, payload as any);
        addToast('Reparto de premios actualizado correctamente', 'success');
      } else {
        await RegistrosService.createRegistro(payload as any);
        addToast('Premios repartidos y publicados correctamente', 'success');
      }
      onClose();
    } catch (err: any) {
      addToast(err.message || 'Error al guardar el reparto', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-start sm:items-center justify-center p-4 sm:p-6 xl:p-12 overflow-y-auto">
        <div
          className="ninja-card-oro no-hover p-[2px] w-full max-w-6xl shadow-[0_0_100px_rgba(0,0,0,0.9)] my-8 sm:my-auto overflow-hidden relative flex flex-col h-[85vh] sm:h-auto max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-oro/5 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none" />

          {/* Cabecera del Formulario */}
          <header className="bg-black/40 p-4 sm:p-10 xl:p-12 flex flex-col md:flex-row justify-between items-center gap-6 border-b border-oro/10 relative z-10 flex-shrink-0">
            <div className="flex items-center text-center sm:text-left gap-4 sm:gap-8 w-full md:w-auto">
              <div>
                <h2 className="ninja-title text-xl sm:text-3xl xl:text-5xl leading-none">
                  {editingRegistry ? 'EDITAR REPARTO' : 'REPARTIR PREMIOS'}
                </h2>
                <p className="text-caption sm:text-caption xl:text-xs font-black uppercase tracking-[0.4em] mt-3 italic">
                  {activeNews.titulo}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-oro/30 hover:text-oro transition-all hover:rotate-90"
            >
              <X className="w-8 h-8 sm:w-10 sm:h-10" />
            </button>
          </header>

          {/* Contenido en Scroll */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-12 xl:p-16 space-y-8 sm:space-y-12 relative z-10 bg-transparent custom-scrollbar">
            {/* URL de la Imagen / Banner del Reparto (Opcional) */}
            <div className="space-y-3 p-6 bg-black/40 border border-oro/10 ninja-clip-sm">
              <label className="text-xs font-black uppercase tracking-[0.25em]  flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-oro/60" /> URL DE LA IMAGEN / BANNER DEL REPARTO (OPCIONAL)
              </label>
              <input
                type="text"
                value={urlImagen}
                onChange={(e) => setUrlImagen(e.target.value)}
                placeholder="Ej. https://... (Si no se especifica, en la web no se muestra imagen y en el Embed de Discord se usa la del evento)"
                className="w-full bg-black/60 border border-oro/20 hover:border-oro/40 focus:border-oro/60 px-5 py-3 text-xs text-oro font-bold outline-none transition-all placeholder:text-oro/20 ninja-clip-xs"
              />
            </div>

            {/* Mención a Roles en Discord */}
            <div className="space-y-3 p-6 bg-black/40 border border-oro/10 ninja-clip-sm">
              <label className="text-xs font-black uppercase tracking-[0.25em] text-white flex items-center gap-2">
                <AtSign className="w-4 h-4 text-oro/60" /> MENCIÓN A ROLES DE DISCORD
              </label>
              {pingRoles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-1">
                  {pingRoles.map(v => (
                    <span
                      key={v}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-oro/10 border border-oro/40 text-oro text-caption font-black uppercase tracking-wider ninja-clip-xs"
                    >
                      {roleLabel(v)}
                      <button
                        type="button"
                        onClick={() => togglePingRole(v)}
                        className="text-oro/60 hover:text-naranja-naruto transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div ref={roleDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setRoleDropdownOpen(prev => !prev)}
                  className={`w-full flex items-center justify-between bg-black/60 px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all border ninja-clip-xs ${roleDropdownOpen ? 'border-oro/60 text-oro' : 'border-oro/20 hover:border-oro/50 text-oro/70'}`}
                >
                  <span>{pingRoles.length === 0 ? 'Seleccionar roles...' : `${pingRoles.length} rol${pingRoles.length > 1 ? 'es' : ''} seleccionado${pingRoles.length > 1 ? 's' : ''}`}</span>
                  <span className={`transition-transform duration-150 text-oro/60 ${roleDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {roleDropdownOpen && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#0a0a0a] border border-oro/30 shadow-[0_8px_32px_rgba(0,0,0,0.8)] max-h-56 overflow-y-auto custom-scrollbar ninja-clip-xs">
                    {allRoleOptions.map(opt => {
                      const isSelected = pingRoles.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => togglePingRole(opt.value)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-black uppercase tracking-wider transition-colors border-b border-oro/5 last:border-0 ${isSelected ? 'bg-oro/10 text-oro' : ' hover:bg-oro/5 hover:text-oro/90'}`}
                        >
                          <span className={`w-4 h-4 border flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-oro border-oro' : 'border-oro/30 hover:border-oro/60'}`}>
                            {isSelected && <span className="text-negro text-[10px] font-black">✓</span>}
                          </span>
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Texto de Entrega de Premios (Notificación Discord) */}
            <div className="space-y-3 p-6 bg-black/40 border border-oro/10 ninja-clip-sm">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black uppercase tracking-[0.25em]  flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-oro/60" /> NOTA / DESCRIPCIÓN DE ENTREGA DE PREMIOS (FORMATO DISCORD)
                </label>
                <span className={`text-caption font-black tracking-widest tabular-nums ${textoEntrega.length >= 1400 ? 'text-naranja-naruto' : ''}`}>
                  {textoEntrega.length} / 1500
                </span>
              </div>

              {/* Guía de Formatos Markdown */}
              <div className="bg-black/30 border border-oro/10 p-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px]  font-bold uppercase tracking-wider ninja-clip-xs">
                <div><span className="text-oro font-black">**Negrita**</span></div>
                <div><span className="text-oro font-black">*Cursiva*</span></div>
                <div><span className="text-oro font-black">__Subrayado__</span></div>
                <div><span className="text-oro font-black">~~Tachado~~</span></div>
                <div><span className="text-oro font-black">`Código`</span></div>
                <div><span className="text-oro font-black">- Lista</span></div>
              </div>

              <textarea
                maxLength={1500}
                rows={3}
                value={textoEntrega}
                onChange={(e) => setTextoEntrega(e.target.value)}
                placeholder="Escribe un mensaje o aclaración utilizando markdown (**negrita**, *cursiva*, etc.) que se enviará a Discord y se mostrará en la web..."
                className="w-full ninja-input py-3 px-4 text-xs font-medium resize-none"
              />

              {/* Vista previa en tiempo real de Markdown */}
              {textoEntrega.trim() && (
                <div className="space-y-2 pt-2 border-t border-oro/10">
                  <span className="text-[10px] font-black uppercase tracking-[0.25em]  block">
                    VISTA PREVIA DE LA NOTA (MARKDOWN EN TIEMPO REAL)
                  </span>
                  <div className="p-4 bg-black/60 border border-oro/20 text-xs text-oro/90 font-medium ninja-clip-xs leading-relaxed">
                    {renderDiscordMarkdown(textoEntrega)}
                  </div>
                </div>
              )}
            </div>

            {/* Opción de Recuperación por Inasistencia */}
            <div className="p-6 bg-black/40 border border-oro/10 ninja-clip-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-[0.25em] text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-oro" /> EVENTO RECUPERABLE POR INASISTENCIA
                </label>
                <p className="text-[11px] font-bold text-oro/40 uppercase tracking-wider">
                  Permite a los ninjas ausentes solicitar recompensas base mediante una escena de roleo (máx. 5 días).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRecuperable(!recuperable)}
                className={`px-5 py-2.5 font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2.5 ninja-clip-xs border ${
                  recuperable
                    ? 'bg-oro/15 border-oro text-oro shadow-[0_0_15px_rgba(255,230,159,0.15)]'
                    : 'bg-black/60 border-oro/20 text-oro/40 hover:border-oro/40'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${recuperable ? 'bg-oro shadow-[0_0_8px_#ffd56b]' : 'bg-oro/20'}`} />
                {recuperable ? 'RECUPERABLE: SÍ' : 'RECUPERABLE: NO'}
              </button>
            </div>

            {/* Premios Globales */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 bg-black/40 border border-oro/10 ninja-clip-sm relative">
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-[0.25em]  flex items-center gap-2 min-h-[2.5rem]">
                  EXP GLOBAL (Para todos)
                </label>
                <input
                  type="number"
                  min="0"
                  value={globalXp}
                  onChange={(e) => setGlobalXp(Math.max(0, Number(e.target.value)))}
                  placeholder="EXP global..."
                  className="w-full ninja-input py-3.5 text-sm"
                />
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-[0.25em]  flex items-center gap-2 min-h-[2.5rem]">
                  RYOUS GLOBALES (Para todos)
                </label>
                <input
                  type="number"
                  min="0"
                  value={globalRyous}
                  onChange={(e) => setGlobalRyous(Math.max(0, Number(e.target.value)))}
                  placeholder="Ryous globales..."
                  className="w-full ninja-input py-3.5 text-sm"
                />
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-[0.25em]  flex items-center gap-2 min-h-[2.5rem]">
                  PA GLOBAL (Para todos)
                </label>
                <input
                  type="number"
                  min="0"
                  value={globalPa}
                  onChange={(e) => setGlobalPa(Math.max(0, Number(e.target.value)))}
                  placeholder="PA globales..."
                  className="w-full ninja-input py-3.5 text-sm"
                />
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-[0.25em]  flex items-center gap-2 min-h-[2.5rem]">
                  MONEDAS GLOBAL (Para todos)
                </label>
                <input
                  type="number"
                  min="0"
                  value={globalMonedasEvento}
                  onChange={(e) => setGlobalMonedasEvento(Math.max(0, Number(e.target.value)))}
                  placeholder="Monedas globales..."
                  className="w-full ninja-input py-3.5 text-sm"
                />
              </div>
            </div>

            {/* Buscador de Participantes */}
            <div className="space-y-4">
              <label className="text-xs font-black uppercase tracking-[0.25em]  ml-1">Seleccionar shinobi del Evento</label>
              <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-oro/20" />
                <input
                  type="text"
                  value={participantSearch}
                  onChange={(e) => handleSearchParticipants(e.target.value)}
                  placeholder="BUSCAR SHINOBI POR NOMBRE..."
                  className="w-full ninja-input pl-16 py-5 text-xs font-black"
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

            {/* Listado Detallado de Participantes y Premios Propios */}
            <div className="space-y-6">
              <h4 className="text-xs font-black uppercase tracking-[0.25em]  border-b border-oro/10 pb-4">
                Desglose Individual de Premios ({participants.length} Seleccionados)
              </h4>

              {participants.length === 0 ? (
                <div className="p-10 text-center bg-black/20 border border-oro/5">
                  <p className="text-caption font-black uppercase tracking-widest text-oro/30 italic">Añade ninjas usando el buscador superior para repartirles recompensas</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {participants.map((p) => (
                    <div key={p.id} className="p-6 bg-black/50 border border-oro/10 hover:border-oro/30 transition-all ninja-clip-sm space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                      <div className="flex justify-between items-center border-b border-oro/5 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-oro/10 border border-oro/20 ninja-clip-xs">
                            <User className="w-4 h-4 text-oro/60" />
                          </div>
                          <span className="text-sm font-black text-oro uppercase tracking-wider">{p.nombre_ninja}</span>
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
                          Recompensas del Glosario (Técnicas, Objetos, etc.)
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
                            <Plus className="w-3.5 h-3.5" /> Añadir Glosario
                          </button>
                        </div>

                        {/* Dropdown del Selector de Glosario para el personaje */}
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
                                <span className="text-caption font-black uppercase ">Validando requisitos del jugador...</span>
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
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Botones de Operación */}
          <footer className="flex flex-col-reverse sm:flex-row justify-end items-center gap-6 sm:gap-8 p-4 sm:p-6 border-t border-oro/10 relative z-10 bg-black/40 flex-shrink-0">
            <button type="button" onClick={onClose} className="text-caption sm:text-caption xl:text-xs font-black uppercase tracking-[0.4em]  hover:text-naranja-naruto transition-colors italic bg-transparent border-none outline-none cursor-pointer">CANCELAR</button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full sm:w-auto ninja-btn-oro px-8 py-3.5 flex items-center justify-center gap-3 shadow-2xl active:scale-95 disabled:opacity-50"
            >
              <span>{loading ? 'PUBLICANDO PREMIOS...' : editingRegistry ? 'CONFIRMAR CAMBIOS' : 'REPARTIR PREMIOS'}</span>
            </button>
          </footer>
        </div>
      </div>
    </Portal>
  );
}
