'use client';

import { useState, useEffect } from 'react';
import { RegistrosService } from '@/services/supabase/registros.service';
import { CharacterService } from '@/services/supabase/character.service';
import { Glosario, Registro } from '@/domain/types';
import { useToastStore } from '@/components/ui/Toast';
import { useCharacterStore } from '@/store/useCharacterStore';
import { AuthService } from '@/services/supabase/auth.service';
import { ProfileService } from '@/services/supabase/profile.service';
import { X, Search, UserPlus, User, Trash2, Coins, Sparkles, Plus, BookOpen } from 'lucide-react';

interface EventRewardFormProps {
  activeNews: {
    id?: string;
    discord_msg_id: string;
    titulo: string;
    categoria: string;
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

  // Rewards states
  const [globalXp, setGlobalXp] = useState<number>(Number(editingRegistry?.data?.global_xp) || 0);
  const [globalRyous, setGlobalRyous] = useState<number>(Number(editingRegistry?.data?.global_ryous) || 0);
  const [globalMonedasEvento, setGlobalMonedasEvento] = useState<number>(Number(editingRegistry?.data?.global_monedas_evento) || 0);

  // Participants & Rewards
  const [participants, setParticipants] = useState<any[]>([]);
  const [participantSearch, setParticipantSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Glosario selection states per user
  const [validGlosarioItems, setValidGlosarioItems] = useState<Record<number, Glosario[]>>({});
  const [loadingGlosario, setLoadingGlosario] = useState<Record<number, boolean>>({});
  const [activeGlosarioSelector, setActiveGlosarioSelector] = useState<number | null>(null);
  const [glosarioSearchQuery, setGlosarioSearchQuery] = useState('');

  // Load editing registry participants if editing
  useEffect(() => {
    if (editingRegistry) {
      setGlobalXp(Number(editingRegistry.data?.global_xp) || 0);
      setGlobalRyous(Number(editingRegistry.data?.global_ryous) || 0);
      setGlobalMonedasEvento(Number(editingRegistry.data?.global_monedas_evento) || 0);
      
      const initialParts = editingRegistry.participantes?.map((p: any) => {
        const premio = editingRegistry.data?.participantes_premios?.find((pr: any) => Number(pr.personaje_id) === Number(p.personaje_id));
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
    }
  }, [editingRegistry]);

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
        // Prevent duplicate glosario rewards
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
    if (!activeCharacter && !adminProfile) {
      addToast('No se ha detectado un personaje administrador activo ni cuenta administradora.', 'error');
      return;
    }
    if (participants.length === 0) {
      addToast('Añade al menos un participante para repartir premios', 'error');
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
          global_xp: globalXp,
          global_ryous: globalRyous,
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
            monedas_evento: Number(p.monedas_evento) || 0,
            glosario_items: p.glosario_items
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
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-start sm:items-center justify-center p-4 sm:p-6 xl:p-12 overflow-y-auto">
      <div
        className="ninja-card-oro w-full max-w-4xl shadow-[0_0_100px_rgba(0,0,0,0.9)] my-8 sm:my-auto overflow-hidden relative flex flex-col h-[85vh] sm:h-auto max-h-[85vh]"
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
              <p className="text-[8px] sm:text-[10px] xl:text-xs font-black text-oro/30 uppercase tracking-[0.4em] mt-3 italic">
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
          {/* Premios Globales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-6 bg-black/40 border border-oro/10 ninja-clip-sm relative">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Sparkles className="w-20 h-20 text-oro" />
            </div>
            <div className="space-y-4">
              <label className="text-xs font-black uppercase tracking-[0.25em] text-oro/50 flex items-center gap-2 min-h-[2.5rem]">
                <Sparkles className="w-4 h-4 text-oro" /> EXP GLOBAL (Para todos)
              </label>
              <input
                type="number"
                min="0"
                value={globalXp}
                onChange={(e) => setGlobalXp(Math.max(0, Number(e.target.value)))}
                placeholder="EXP global..."
                className="w-full ninja-input py-4 text-sm"
              />
            </div>
            <div className="space-y-4">
              <label className="text-xs font-black uppercase tracking-[0.25em] text-oro/50 flex items-center gap-2 min-h-[2.5rem]">
                <Coins className="w-4 h-4 text-oro" /> RYOUS GLOBALES (Para todos)
              </label>
              <input
                type="number"
                min="0"
                value={globalRyous}
                onChange={(e) => setGlobalRyous(Math.max(0, Number(e.target.value)))}
                placeholder="Ryous globales..."
                className="w-full ninja-input py-4 text-sm"
              />
            </div>
            <div className="space-y-4">
              <label className="text-xs font-black uppercase tracking-[0.25em] text-oro/50 flex items-center gap-2 min-h-[2.5rem]">
                <Coins className="w-4 h-4 text-oro" /> MONEDAS GLOBAL (Para todos)
              </label>
              <input
                type="number"
                min="0"
                value={globalMonedasEvento}
                onChange={(e) => setGlobalMonedasEvento(Math.max(0, Number(e.target.value)))}
                placeholder="Monedas globales..."
                className="w-full ninja-input py-4 text-sm"
              />
            </div>
          </div>

          {/* Buscador de Participantes */}
          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-[0.25em] text-oro/50 ml-1">Seleccionar Shinobis del Evento</label>
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
            <h4 className="text-xs font-black uppercase tracking-[0.25em] text-oro/40 border-b border-oro/10 pb-4">
              Desglose Individual de Premios ({participants.length} Seleccionados)
            </h4>

            {participants.length === 0 ? (
              <div className="p-10 text-center bg-black/20 border border-oro/5">
                <p className="text-[10px] font-black uppercase tracking-widest text-oro/30 italic">Añade ninjas usando el buscador superior para repartirles recompensas</p>
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
                        className="p-2 hover:bg-rojo-sangre/20 text-oro/30 hover:text-rojo-sangre transition-all ninja-clip-xs"
                        title="Quitar Participante"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-oro/40 ml-1">EXP EXTRA INDEPENDIENTE</label>
                        <input
                          type="number"
                          min="0"
                          value={p.xp_extra}
                          onChange={(e) => updateParticipantField(p.id, 'xp_extra', Math.max(0, Number(e.target.value)))}
                          className="w-full ninja-input py-3 text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-oro/40 ml-1">RYOUS EXTRA INDEPENDIENTES</label>
                        <input
                          type="number"
                          min="0"
                          value={p.ryous_extra}
                          onChange={(e) => updateParticipantField(p.id, 'ryous_extra', Math.max(0, Number(e.target.value)))}
                          className="w-full ninja-input py-3 text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-oro/40 ml-1">MONEDAS DE EVENTO</label>
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
                      <label className="text-[10px] font-black uppercase tracking-widest text-oro/40 ml-1 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" /> Recompensas del Glosario (Técnicas, Objetos, etc.)
                      </label>

                      <div className="flex flex-wrap gap-2.5 items-center">
                        {p.glosario_items?.map((item: any) => (
                          <span
                            key={item.id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#050309] border border-oro/25 text-[10px] font-black text-oro uppercase tracking-wider ninja-clip-xs"
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

                        {/* Botón para abrir Selector de Glosario específico para este jugador */}
                        <button
                          onClick={() => {
                            setActiveGlosarioSelector(activeGlosarioSelector === p.id ? null : p.id);
                            setGlosarioSearchQuery('');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-oro/5 hover:bg-oro hover:text-rojo-sangre border border-oro/15 hover:border-oro text-[10px] font-black text-oro uppercase tracking-wider transition-all ninja-clip-xs"
                        >
                          <Plus className="w-3.5 h-3.5" /> Añadir Glosario
                        </button>
                      </div>

                      {/* Dropdown del Selector de Glosario para el personaje */}
                      {activeGlosarioSelector === p.id && (
                        <div className="mt-3 p-4 bg-[#0A0A0A] border border-oro/20 space-y-4 animate-in zoom-in-95 duration-200">
                          <input
                            type="text"
                            placeholder="FILTRAR GLOSARIO..."
                            value={glosarioSearchQuery}
                            onChange={(e) => setGlosarioSearchQuery(e.target.value)}
                            className="w-full ninja-input py-2.5 px-4 text-xs font-black"
                          />

                          {loadingGlosario[p.id] ? (
                            <div className="flex items-center gap-2 py-4 justify-center">
                              <span className="text-[10px] font-black uppercase text-oro/40">Validando requisitos del jugador...</span>
                            </div>
                          ) : (
                            <div className="max-h-48 overflow-y-auto custom-scrollbar divide-y divide-oro/5">
                              {(validGlosarioItems[p.id] || [])
                                .filter(item => item.nombre_es.toLowerCase().includes(glosarioSearchQuery.toLowerCase()))
                                .map((item) => (
                                  <button
                                    key={item.id}
                                    onClick={() => addGlosarioItemToParticipant(p.id, item)}
                                    className="w-full text-left py-3 px-4 hover:bg-oro/10 text-xs font-black text-oro/60 hover:text-oro flex justify-between items-center uppercase tracking-widest border-b border-oro/5 last:border-0"
                                  >
                                    <span>{item.nombre_es}</span>
                                    <span className="text-[9px] font-bold text-oro/30">Cumple requisitos</span>
                                  </button>
                                ))}

                              {(validGlosarioItems[p.id] || []).filter(item => item.nombre_es.toLowerCase().includes(glosarioSearchQuery.toLowerCase())).length === 0 && (
                                <div className="text-center py-6">
                                  <p className="text-[10px] font-black uppercase text-oro/20 italic">No hay ítems válidos para los requisitos de este personaje</p>
                                </div>
                              )}
                            </div>
                          )}
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
          <button type="button" onClick={onClose} className="text-[9px] sm:text-[10px] xl:text-xs font-black uppercase tracking-[0.4em] text-oro/40 hover:text-rojo-sangre transition-colors italic bg-transparent border-none outline-none cursor-pointer">CANCELAR</button>
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
  );
}
