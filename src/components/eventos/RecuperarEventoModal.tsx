import { useState, useEffect } from 'react';
import { MasterService } from '@/services/supabase/master.service';
import { RegistrosService } from '@/services/supabase/registros.service';
import { useToastStore } from '@/components/ui/Toast';
import { Portal } from '@/components/ui/Portal';
import { X, Plus, Trash2, Link as LinkIcon, Sparkles, AlertCircle, ShieldCheck, UserPlus, Search } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface RecuperarEventoModalProps {
  isOpen: boolean;
  onClose: () => void;
  evento?: any;
  ultimoRegistroPremios: any;
  activeCharacter: any;
  tipoOrigen?: 'evento' | 'narracion';
  onSuccess?: () => void;
}

export default function RecuperarEventoModal({
  isOpen,
  onClose,
  evento,
  ultimoRegistroPremios,
  activeCharacter,
  tipoOrigen = 'evento',
  onSuccess
}: RecuperarEventoModalProps) {
  const isNarracion = tipoOrigen === 'narracion' || ultimoRegistroPremios?.subtipo === 'narracion';
  const itemTitle = evento?.titulo || ultimoRegistroPremios?.data?.titulo || (isNarracion ? 'Narración' : 'Evento');

  const [imageUrls, setImageUrls] = useState<string[]>(['']);
  const [availableCharacters, setAvailableCharacters] = useState<any[]>([]);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<number[]>([]);
  const [participantSearch, setParticipantSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const addToast = useToastStore(state => state.addToast);

  useEffect(() => {
    if (!isOpen) return;

    const loadCharacters = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data: pjs } = await supabase
          .from('reg_characters')
          .select('id, nombre_ninja, url_img, rango, info_aldeas(nombre_jap)')
          .eq('activo', true)
          .order('nombre_ninja', { ascending: true });

        setAvailableCharacters(pjs || []);

        if (activeCharacter?.id) {
          setSelectedCharacterIds([Number(activeCharacter.id)]);
        }
      } catch (err) {
        console.error('Error loading characters for event recovery:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCharacters();
  }, [isOpen, activeCharacter]);

  if (!isOpen) return null;

  // Valores base del reparto de premios del evento
  const baseGlobalXp = Number(ultimoRegistroPremios?.data?.global_xp) || 0;
  const baseGlobalRyous = Number(ultimoRegistroPremios?.data?.global_ryous) || 0;
  const baseGlobalPa = Number(ultimoRegistroPremios?.data?.global_pa) || 0;

  // Recompensas base completas (100%)
  const recuperadoXp = baseGlobalXp;
  const recuperadoRyous = baseGlobalRyous;
  const recuperadoPa = baseGlobalPa;

  const handleAddUrlField = () => {
    setImageUrls([...imageUrls, '']);
  };

  const handleRemoveUrlField = (index: number) => {
    if (imageUrls.length <= 1) return;
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };

  const handleUrlChange = (index: number, val: string) => {
    const updated = [...imageUrls];
    updated[index] = val;
    setImageUrls(updated);
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
        !selectedCharacterIds.includes(Number(r.id))
      ));
    } catch (err) {
      console.error(err);
    }
  };

  const addSelectedCharacter = (char: { id: number; nombre_ninja: string; url_img?: string; hobba_name?: string }) => {
    const charId = Number(char.id);
    if (selectedCharacterIds.includes(charId)) return;

    setSelectedCharacterIds(prev => [...prev, charId]);
    setAvailableCharacters(prev => {
      if (!prev.some(c => Number(c.id) === charId)) {
        return [...prev, char];
      }
      return prev;
    });

    setParticipantSearch('');
    setSearchResults([]);
  };

  const handleRemoveCharacter = (charId: number) => {
    if (charId === Number(activeCharacter?.id)) {
      addToast('No puedes quitar a tu propio personaje activo del registro', 'info');
      return;
    }
    setSelectedCharacterIds(selectedCharacterIds.filter(id => id !== charId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanUrls = imageUrls.map(u => u.trim()).filter(Boolean);
    if (cleanUrls.length === 0) {
      addToast('Debes adjuntar al menos una URL con la imagen de la escena de roleo (mínimo 15 diálogos)', 'error');
      return;
    }

    if (selectedCharacterIds.length === 0) {
      addToast('Debes seleccionar al menos un personaje para la solicitud', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/registros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          payload: {
            tipo: 'accion',
            subtipo: isNarracion ? 'recuperacion_narracion' : 'recuperacion_evento',
            autor_id: activeCharacter?.id,
            participantes_ids: selectedCharacterIds,
            data: {
              titulo: `Recuperación: ${itemTitle}`,
              evento_id: evento?.id || null,
              evento_premios_id: ultimoRegistroPremios?.id,
              global_xp: baseGlobalXp,
              global_ryous: baseGlobalRyous,
              global_pa: baseGlobalPa,
              recuperado_xp: recuperadoXp,
              recuperado_ryous: recuperadoRyous,
              recuperado_pa: recuperadoPa,
              urls_imagenes: cleanUrls,
              participantes_premios: ultimoRegistroPremios?.data?.participantes_premios || []
            }
          }
        })
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Error al enviar la solicitud');
      }

      addToast('Solicitud de recuperación enviada a moderación con éxito', 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4 sm:p-6 xl:p-12 overflow-y-auto">
        <div
          className="ninja-card-oro no-hover p-[2px] w-full max-w-4xl shadow-[0_0_100px_rgba(0,0,0,0.9)] my-auto overflow-hidden relative flex flex-col max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-oro/5 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none" />

          {/* Encabezado estandarizado */}
          <header className="bg-black/40 p-6 sm:p-8 flex justify-between items-center border-b border-oro/10 relative z-10 flex-shrink-0">
            <div>
              <h2 className="ninja-title text-2xl sm:text-4xl leading-none">
                {isNarracion ? 'RECUPERAR NARRACIÓN' : 'RECUPERAR EVENTO'}
              </h2>
              <p className="text-caption font-black uppercase tracking-[0.4em] text-oro/40 mt-2 italic">
                SOLICITUD DE ROLEO POR INASISTENCIA (RECOMPENSAS BASE)
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-oro/30 hover:text-oro transition-all hover:rotate-90 cursor-pointer"
            >
              <X className="w-8 h-8" />
            </button>
          </header>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 relative z-10 custom-scrollbar">
            {/* Tarjeta Informativa del Evento o Narración */}
            <div className="p-6 bg-black/40 border border-oro/10 ninja-clip-sm space-y-5">
              <div className="flex justify-between items-start border-b border-oro/10 pb-4">
                <div>
                  <span className="text-caption font-black text-oro/40 uppercase tracking-[0.25em] block">
                    {isNarracion ? 'NARRACIÓN SELECCIONADA' : 'EVENTO SELECCIONADO'}
                  </span>
                  <h3 className="text-xl font-black text-oro uppercase tracking-wider italic mt-1">
                    {itemTitle}
                  </h3>
                </div>
                <span className="px-3.5 py-1.5 bg-oro/10 border border-oro/30 text-oro text-caption font-black uppercase tracking-widest ninja-clip-xs">
                  RECOMPENSAS BASE
                </span>
              </div>

              {/* Desglose de Recompensas Estimadas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-black/60 p-4 border border-oro/15 text-center ninja-clip-xs">
                  <span className="text-caption font-black text-oro/40 uppercase tracking-widest block">
                    EXPERIENCIA
                  </span>
                  <span className="text-oro font-black text-lg mt-1 block">
                    +{recuperadoXp} EXP
                  </span>
                </div>

                <div className="bg-black/60 p-4 border border-oro/15 text-center ninja-clip-xs">
                  <span className="text-caption font-black text-oro/40 uppercase tracking-widest block">
                    RYOUS
                  </span>
                  <span className="text-oro font-black text-lg mt-1 block">
                    +{recuperadoRyous} RYOUS
                  </span>
                </div>

                <div className="bg-black/60 p-4 border border-oro/15 text-center ninja-clip-xs">
                  <span className="text-caption font-black text-oro/40 uppercase tracking-widest block">
                    PUNTOS AP
                  </span>
                  <span className="text-oro font-black text-lg mt-1 block">
                    +{recuperadoPa} PA
                  </span>
                </div>
              </div>

              <p className="text-caption font-bold text-naranja-naruto/90 italic flex items-center gap-2 pt-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {isNarracion
                  ? 'Las Monedas de Evento y Objetos especiales entregados en la narración original quedan excluidos de la recuperación.'
                  : 'Las Monedas de Evento y Objetos especiales entregados en el evento original quedan excluidos de la recuperación.'}
              </p>
            </div>

            {/* URLs de la Escena de Roleo */}
            <div className="space-y-4 p-6 bg-black/40 border border-oro/10 ninja-clip-sm">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black uppercase tracking-[0.25em] text-white flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-oro/60" /> IMÁGENES DE LA ESCENA DE ROLEO (MÍNIMO 15 DIÁLOGOS)
                </label>
                <button
                  type="button"
                  onClick={handleAddUrlField}
                  className="text-caption font-black uppercase tracking-widest text-naranja-naruto hover:text-oro transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> AÑADIR URL
                </button>
              </div>

              <div className="space-y-3">
                {imageUrls.map((url, idx) => (
                  <div key={idx} className="flex gap-3 items-center">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => handleUrlChange(idx, e.target.value)}
                      placeholder="Ej. https://imgur.com/tu_escena_de_roleo.png"
                      required={idx === 0}
                      className="flex-1 bg-black/60 border border-oro/20 hover:border-oro/40 focus:border-oro/60 px-5 py-3 text-xs text-oro font-bold outline-none transition-all placeholder:text-oro/20 ninja-clip-xs"
                    />
                    {imageUrls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveUrlField(idx)}
                        className="p-3 bg-red-950/40 border border-red-500/40 text-red-400 hover:bg-red-600 hover:text-white transition-all cursor-pointer ninja-clip-xs"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Selección de Personajes Participantes */}
            <div className="space-y-4 p-6 bg-black/40 border border-oro/10 ninja-clip-sm">
              <label className="text-xs font-black uppercase tracking-[0.25em] text-white flex items-center gap-2">PERSONAJES PARTICIPANTES EN EL ROLEO
              </label>

              {/* Buscador de Shinobi Participantes */}
              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-oro/40" />
                <input
                  type="text"
                  value={participantSearch}
                  onChange={(e) => handleSearchParticipants(e.target.value)}
                  placeholder="BUSCAR SHINOBI PARTICIPANTE POR NOMBRE..."
                  className="w-full ninja-input pl-12 py-3 text-xs font-bold"
                />

                {searchResults.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-2 bg-black border border-oro/30 shadow-[0_10px_35px_rgba(0,0,0,0.9)] divide-y divide-oro/10 animate-in fade-in zoom-in duration-200 ninja-clip-xs">
                    {searchResults.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addSelectedCharacter(p)}
                        className="w-full px-5 py-3 text-left text-xs font-black text-oro/70 hover:bg-oro/15 hover:text-oro flex items-center gap-3 uppercase tracking-widest transition-all cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4 text-naranja-naruto" />
                        <span>{p.nombre_ninja} {p.hobba_name ? `(${p.hobba_name})` : ''}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Lista de Personajes Seleccionados */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {selectedCharacterIds.map((charId) => {
                  const char = availableCharacters.find(c => c.id === charId) || (charId === activeCharacter?.id ? activeCharacter : null);
                  const isOwner = charId === Number(activeCharacter?.id);

                  return (
                    <div
                      key={charId}
                      className={`flex items-center justify-between p-3.5 border ${isOwner ? 'bg-oro/10 border-oro/40' : 'bg-black/50 border-oro/20'} ninja-clip-xs`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-9 h-9 border border-oro/30 bg-black/80 overflow-hidden shrink-0 flex items-center justify-center ninja-clip-xs">
                          {char?.url_img ? (
                            <img src={char.url_img} alt={char.nombre_ninja} className="w-full h-full object-cover object-top" />
                          ) : (
                            <span className="text-oro font-black text-xs">{char?.nombre_ninja?.charAt(0) || 'P'}</span>
                          )}
                        </div>
                        <div className="truncate">
                          <span className="text-xs font-black text-oro uppercase truncate block">
                            {char?.nombre_ninja || `Personaje #${charId}`}
                          </span>
                          <span className="text-caption text-oro/40 font-bold uppercase block mt-0.5">
                            {isOwner ? 'SOLICITANTE PRINCIPAL' : 'PARTICIPANTE ADJUNTO'}
                          </span>
                        </div>
                      </div>

                      {!isOwner && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCharacter(charId)}
                          className="p-1.5 text-oro/40 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Botones de Acción Estandarizados */}
            <div className="pt-6 border-t border-oro/10 flex flex-col sm:flex-row gap-4 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-6 bg-black/40 border border-oro/20 text-oro/60 hover:text-oro hover:border-oro text-xs font-black uppercase tracking-[0.2em] transition-all cursor-pointer"
              >
                CANCELAR
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="ninja-btn-oro py-3 px-8 text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-oro/10 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-naranja-naruto border-t-transparent rounded-full animate-spin" />
                    ENVIANDO...
                  </>
                ) : (
                  'ENVIAR A REVISIÓN'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}
