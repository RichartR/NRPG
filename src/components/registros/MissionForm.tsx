'use client';

import { useState, useEffect } from 'react';
import { RegistrosService } from '@/services/supabase/registros.service';
import { Registro, MisionMaster } from '@/domain/types';
import { useCharacterStore } from '@/store/useCharacterStore';
import { useToastStore } from '@/components/ui/Toast';
import { X, Link as LinkIcon, Search, UserPlus, User } from 'lucide-react';
import { NinjaSelect } from '@/components/ui/Fields';

type FormType = 'mision' | 'accion';

export default function MissionForm({
  onCreated,
  initialType = 'mision',
  initialData = null
}: {
  onCreated: () => void,
  initialType?: FormType,
  initialData?: Registro | null
}) {
  const { activeCharacter, fetchActiveCharacter } = useCharacterStore();
  const addToast = useToastStore(state => state.addToast);

  useEffect(() => {
    if (!activeCharacter) {
      fetchActiveCharacter();
    }
  }, []);

  const [formType] = useState<FormType>(initialData?.tipo as FormType || initialType);
  const [loading, setLoading] = useState(false);

  // Misiones
  const [rango, setRango] = useState(initialData?.subtipo || 'D');
  const [misiones, setMisiones] = useState<MisionMaster[]>([]);
  const [selectedMision, setSelectedMision] = useState<string>(initialData?.data?.codigo_mision || '');
  const [esFallida, setEsFallida] = useState<boolean>(initialData?.data?.fallida || false);

  // General
  const [titulo, setTitulo] = useState(initialData?.data?.titulo || '');
  const [images, setImages] = useState<string[]>(initialData?.data?.urls_imagenes || ['']);

  // Participantes
  const [participantSearch, setParticipantSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: number; nombre_ninja: string; hobba_name?: string | null }[]>([]);
  const [participants, setParticipants] = useState<{ id: number; nombre_ninja: string }[]>(
    initialData?.participantes?.map((p: any) => ({ id: p.personaje_id, nombre_ninja: p.personaje?.nombre_ninja }))
      .filter((p: any) => p.id && Number(p.id) !== Number(initialData?.autor_id)) || []
  );

  useEffect(() => {
    if (formType === 'mision') fetchMisiones();
  }, [rango, formType]);

  const fetchMisiones = async () => {
    try {
      const data = await RegistrosService.getMisionesByRango(rango);
      setMisiones(data);
    } catch (err) {
      console.error(err);
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
        Number(r.id) !== Number(activeCharacter?.id) &&
        !participants.find(p => Number(p.id) === Number(r.id))
      ));
    } catch (err) {
      console.error(err);
    }
  };

  const addParticipant = (p: { id: number; nombre_ninja: string }) => {
    setParticipants([...participants, p]);
    setParticipantSearch('');
    setSearchResults([]);
  };

  const removeParticipant = (id: number) => {
    setParticipants(participants.filter(p => p.id !== id));
  };

  const handleSubmit = async () => {
    if (!activeCharacter) {
      addToast('No se ha detectado un personaje activo.', 'error');
      return;
    }

    const validImages = images.filter(img => img.trim() !== '');
    if (validImages.length === 0) {
      addToast('Añade al menos una prueba (URL)', 'error');
      return;
    }

    let payload: any = {
      tipo: formType,
      autor_id: activeCharacter.id,
      participantes_ids: [activeCharacter.id, ...participants.map(p => p.id)],
      data: {
        urls_imagenes: validImages,
        participantes_historicos: [
          { id: activeCharacter.id, nombre_ninja: activeCharacter.nombre_ninja },
          ...participants.map(p => ({ id: p.id, nombre_ninja: p.nombre_ninja }))
        ]
      }
    };

    if (formType === 'mision') {
      if (!selectedMision) {
        addToast('Selecciona una misión', 'error');
        return;
      }
      const mision = misiones.find(m => m.codigo_mision === selectedMision);
      if (!mision) return;
      payload.subtipo = rango;
      payload.data.titulo = `Misión ${mision.codigo_mision}${esFallida && mision.se_puede_fallar ? ' (Fallada)' : ''}`;
      payload.data.codigo_mision = mision.codigo_mision;
      payload.data.recompensa_xp = esFallida && mision.se_puede_fallar ? (mision.exp_fallida || 0) : (mision.exp || 0);
      payload.data.recompensa_ryous = esFallida && mision.se_puede_fallar ? (mision.ryous_fallida || 0) : (mision.ryous || 0);
      payload.data.recompensa_pa = esFallida && mision.se_puede_fallar ? (mision.pa_recompensa_fallida || 0) : (mision.pa_recompensa || 0);
      payload.data.recompensa_xp_fallida = mision.exp_fallida || 0;
      payload.data.recompensa_ryous_fallida = mision.ryous_fallida || 0;
      payload.data.recompensa_pa_fallida = mision.pa_recompensa_fallida || 0;
      payload.data.se_puede_fallar = mision.se_puede_fallar || false;
      payload.data.fallida = esFallida && mision.se_puede_fallar;
    } else {
      if (!titulo) {
        addToast('Indica un título para el registro', 'error');
        return;
      }
      payload.data.titulo = titulo;
    }

    setLoading(true);
    try {
      if (initialData) {
        await RegistrosService.updateRegistro(initialData.id, payload);
        addToast('Registro actualizado correctamente', 'success');
      } else {
        await RegistrosService.createRegistro(payload);
        addToast('Registro publicado correctamente', 'success');
        fetchActiveCharacter(); // Sincronizar stats locales
      }
      onCreated();
    } catch (err: any) {
      addToast(err.message || 'Error al procesar el registro', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="ninja-card-oro p-8 sm:p-12 xl:p-20 relative overflow-hidden">
        {/* Background Decorative Element */}
        <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
          <img src="/assets/icons/shuriken.png" className="w-64 h-64 rotate-12" alt="bg" />
        </div>

        <div className="relative z-10 space-y-12 sm:space-y-16">
          {/* Header del Formulario (Ahora integrado) */}
          <div className="flex justify-between items-start border-b border-oro/10 pb-10">
            <div className="space-y-2">
              <h3 className="ninja-title text-2xl sm:text-4xl md:text-5xl xl:text-6xl text-oro">
                {initialData ? 'EDITAR REGISTRO' : (formType === 'mision' ? 'REGISTRAR MISIÓN' : 'REGISTRAR ACCIÓN')}
              </h3>
              <p className="text-xs sm:text-sm font-black text-oro/40 uppercase tracking-[0.4em]">Sincronizando con el archivo histórico shinobi</p>
            </div>
            <button
              onClick={() => onCreated()}
              className="group p-4 bg-black/40 border border-oro/10 hover:border-oro/40 transition-all ninja-clip-xs"
            >
              <X className="w-8 h-8 text-oro/40 group-hover:text-oro" />
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 sm:gap-20">
            <div className="space-y-10 sm:space-y-14">
              {formType === 'mision' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-[0.3em] text-oro/40 ml-2">Rango del Pergamino</label>
                    <NinjaSelect
                      value={rango}
                      onChange={(val) => {
                        setRango(val);
                        setEsFallida(false); // Reset fail state on rank change
                      }}
                      placeholder="RANGO..."
                      options={['D', 'C', 'B', 'A', 'S'].map(r => ({ label: `RANGO ${r}`, value: r }))}
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-[0.3em] text-oro/40 ml-2">Misión Seleccionada</label>
                    <NinjaSelect
                      value={selectedMision}
                      onChange={(val) => {
                        setSelectedMision(val);
                        setEsFallida(false); // Reset fail state on mission change
                      }}
                      placeholder="SELECCIONAR..."
                      disabled={misiones.length === 0}
                      options={misiones.map(m => ({ label: `${m.codigo_mision} (+${m.exp} EXP${m.pa_recompensa ? ` / +${m.pa_recompensa} PA` : ''})`, value: m.codigo_mision }))}
                    />
                  </div>
                  {(() => {
                    const misionObj = misiones.find(m => m.codigo_mision === selectedMision);
                    if (!misionObj || !misionObj.se_puede_fallar) return null;

                    return (
                      <div className="space-y-4 md:col-span-2 animate-in fade-in duration-300">
                        <label className="text-xs font-black uppercase tracking-[0.3em] text-oro/40 ml-2">Resultado de la Misión</label>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() => setEsFallida(false)}
                            className={`py-4 border text-xs font-black uppercase tracking-widest transition-all ${!esFallida ? 'bg-oro text-rojo-sangre border-oro' : 'bg-black/20 border-oro/5 text-oro/45'}`}
                          >
                            COMPLETADA (+{misionObj.exp} EXP{misionObj.pa_recompensa ? ` / +${misionObj.pa_recompensa} PA` : ''})
                          </button>
                          <button
                            type="button"
                            onClick={() => setEsFallida(true)}
                            className={`py-4 border text-xs font-black uppercase tracking-widest transition-all ${esFallida ? 'bg-rojo-sangre border-rojo-sangre/40 text-oro' : 'bg-black/20 border-oro/5 text-oro/45'}`}
                          >
                            FALLADA (+{misionObj.exp_fallida} EXP{misionObj.pa_recompensa_fallida ? ` / +${misionObj.pa_recompensa_fallida} PA` : ''})
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-[0.3em] text-oro/40 ml-2">Título de la Crónica</label>
                  <input
                    type="text"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Describe tu acción..."
                    className="w-full ninja-input py-5"
                  />
                </div>
              )}

              {/* Participantes */}
              <div className="space-y-8">
                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-[0.3em] text-oro/40 ml-2">Participantes Involucrados</label>
                  <div className="relative">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-oro/20" />
                    <input
                      type="text"
                      value={participantSearch}
                      onChange={(e) => handleSearchParticipants(e.target.value)}
                      placeholder="BUSCAR POR PERSONAJE O HOBBA..."
                      className="w-full ninja-input pl-16 py-5"
                    />
                  </div>

                  {searchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-2 bg-black border border-oro/20 shadow-[0_10px_30px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in duration-200">
                      {searchResults.map(p => (
                        <button
                          key={p.id}
                          onClick={() => addParticipant(p)}
                          className="w-full px-8 py-6 text-left text-xs font-black text-oro/60 hover:bg-oro/10 hover:text-oro flex items-center gap-4 transition-all border-b border-oro/5 last:border-0 uppercase tracking-widest"
                        >
                          <UserPlus className="w-5 h-5" /> {p.nombre_ninja} {p.hobba_name ? `(${p.hobba_name})` : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-4">
                  <div className="px-6 py-4 bg-oro/10 border border-oro/20 text-xs font-black text-oro/60 uppercase tracking-widest flex items-center gap-4 ninja-clip-xs">
                    <User className="w-4 h-4" /> {activeCharacter?.nombre_ninja} (AUTOR)
                  </div>
                  {participants.map(p => (
                    <div key={p.id} className="px-6 py-4 bg-black/60 border border-oro/10 text-xs font-black text-oro uppercase tracking-widest flex items-center gap-4 ninja-clip-xs group animate-in fade-in slide-in-from-left-2">
                      <User className="w-4 h-4" /> {p.nombre_ninja}
                      <button onClick={() => removeParticipant(p.id)} className="text-rojo-sangre/40 hover:text-rojo-sangre transition-all">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-10 sm:space-y-14">
              {/* Imágenes */}
              <div className="space-y-8">
                <label className="text-xs font-black uppercase tracking-[0.3em] text-oro/40 ml-2">Pruebas del Pergamino (URLs)</label>
                <div className="space-y-6">
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
                          className="w-full ninja-input pl-16 py-5 text-xs font-bold"
                        />
                      </div>
                      {images.length > 1 && (
                        <button
                          onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                          className="p-4 text-oro/20 hover:text-rojo-sangre transition-all"
                        >
                          <X className="w-6 h-6" />
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

              <div className="pt-10">
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className={`w-full py-8 sm:py-10 ninja-btn-oro text-xl sm:text-2xl ${loading ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                >
                  {loading ? 'SELLANDO PERGAMINO...' : initialData ? 'ACTUALIZAR REGISTRO' : 'PUBLICAR EN EL ARCHIVO'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
