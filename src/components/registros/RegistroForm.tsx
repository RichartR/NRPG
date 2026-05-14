'use client';

import { useState, useEffect } from 'react';
import { RegistrosService } from '@/services/supabase/registros.service';
import { Registro, MisionMaster } from '@/domain/types';
import { useCharacterStore } from '@/store/useCharacterStore';
import { useToastStore } from '@/components/ui/Toast';
import { DataField, SelectField } from '@/components/ui/Fields';
import { ScrollText, Plus, X, Link as LinkIcon, Search, UserPlus, User, Zap, Swords, Info } from 'lucide-react';

type FormType = 'mision' | 'combate';

export default function RegistroForm({ 
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
      console.log('No active character found in store, fetching...');
      fetchActiveCharacter();
    }
  }, []);

  const [formType, setFormType] = useState<FormType>(initialData?.tipo as FormType || initialType);
  const [loading, setLoading] = useState(false);
  
  // Misiones
  const [rango, setRango] = useState(initialData?.subtipo || 'D');
  const [misiones, setMisiones] = useState<MisionMaster[]>([]);
  const [selectedMision, setSelectedMision] = useState<string>(initialData?.data?.codigo_mision || '');
  
  // General
  const [titulo, setTitulo] = useState(initialData?.data?.titulo || '');
  const [images, setImages] = useState<string[]>(initialData?.data?.urls_imagenes || ['']);
  const [result, setResult] = useState(initialData?.data?.resultado || 'victoria');
  
  // Participantes
  const [participantSearch, setParticipantSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: number; nombre_ninja: string }[]>([]);
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
    console.log('Submitting form...', { formType, activeCharacter });
    
    if (!activeCharacter) {
      addToast('No se ha detectado un personaje activo. Recarga la página.', 'error');
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
        urls_imagenes: validImages
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
      payload.data.titulo = `Misión ${mision.codigo_mision}`;
      payload.data.codigo_mision = mision.codigo_mision;
      payload.data.recompensa_xp = mision.exp;
      payload.data.recompensa_ryous = mision.ryous;
    } else if (formType === 'combate') {
      if (!titulo) {
        addToast('Indica un título para el combate', 'error');
        return;
      }
      payload.data.titulo = titulo;
      payload.data.resultado = result;
    }

    setLoading(true);
    console.log('Sending payload:', payload);
    try {
      if (initialData) {
        await RegistrosService.updateRegistro(initialData.id, payload);
        addToast('Registro actualizado correctamente', 'success');
      } else {
        await RegistrosService.createRegistro(payload);
        addToast('Registro publicado correctamente', 'success');
      }
      
      if (!initialData) {
        // Reset only if creating new
        setTitulo('');
        setSelectedMision('');
        setParticipants([]);
        setImages(['']);
      }
      
      onCreated();
    } catch (err: any) {
      console.error('Submission error:', err);
      addToast(err.message || 'Error al procesar el registro', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] p-8 space-y-8 backdrop-blur-xl">
      <div className="flex items-center gap-4 mb-2">
        <div className={`p-3 rounded-2xl border ${formType === 'mision' ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' : formType === 'combate' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
          {formType === 'mision' ? <ScrollText className="w-6 h-6" /> : formType === 'combate' ? <Swords className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
        </div>
        <div>
          <h3 className="text-xl font-black text-white uppercase italic tracking-tighter leading-none">
            {formType === 'mision' ? 'Nueva Misión' : formType === 'combate' ? 'Nuevo Combate' : 'Nueva Acción'}
          </h3>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Registra tu actividad shinobi</p>
        </div>
      </div>

      {formType === 'mision' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SelectField label="Rango" value={rango} options={['D', 'C', 'B', 'A', 'S']} onChange={setRango} />
          <SelectField 
            label="Misión" 
            value={selectedMision} 
            options={misiones.map(m => ({ label: `${m.codigo_mision} (+${m.exp} XP)`, value: m.codigo_mision }))} 
            onChange={setSelectedMision}
            placeholder="Seleccionar..."
            disabled={misiones.length === 0}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <DataField label="Título del Registro" value={titulo} onChange={setTitulo} placeholder="Ej: Entrenamiento con mi equipo..." />
          {formType === 'combate' && (
            <SelectField 
              label="Resultado" 
              value={result} 
              options={[{label: 'Victoria', value: 'victoria'}, {label: 'Derrota', value: 'derrota'}, {label: 'Empate', value: 'empate'}]} 
              onChange={setResult} 
            />
          )}
        </div>
      )}

      {/* Participantes */}
      <div className="space-y-4">
        <div className="relative">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1 block mb-2">Participantes</label>
          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input 
              type="text"
              value={participantSearch}
              onChange={(e) => handleSearchParticipants(e.target.value)}
              placeholder="Buscar ninja..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-14 pr-6 py-4 text-white font-bold outline-none focus:border-zinc-700 transition-all placeholder:text-zinc-800"
            />
          </div>
          
          {searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
              {searchResults.map(p => (
                <button key={p.id} onClick={() => addParticipant(p)} className="w-full px-6 py-4 text-left text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white flex items-center gap-3 transition-all border-b border-zinc-800/50 last:border-0">
                  <UserPlus className="w-4 h-4" /> {p.nombre_ninja}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="px-4 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            <User className="w-3 h-3" /> {activeCharacter?.nombre_ninja} (Tú)
          </div>
          {participants.map(p => (
            <div key={p.id} className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-[10px] font-black text-zinc-300 uppercase tracking-widest flex items-center gap-2 group">
              <User className="w-3 h-3" /> {p.nombre_ninja}
              <button onClick={() => removeParticipant(p.id)} className="hover:text-red-500 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Imágenes */}
      <div className="space-y-4">
        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1 block mb-2">Pruebas (Imgur)</label>
        <div className="space-y-3">
          {images.map((img, i) => (
            <div key={i} className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-800" />
                <input 
                  value={img}
                  onChange={(e) => {
                    const newImgs = [...images];
                    newImgs[i] = e.target.value;
                    setImages(newImgs);
                  }}
                  placeholder="https://imgur.com/..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-14 pr-6 py-4 text-white text-xs outline-none focus:border-zinc-700 transition-all placeholder:text-zinc-800"
                />
              </div>
              {images.length > 1 && (
                <button onClick={() => setImages(images.filter((_, idx) => idx !== i))} className="p-4 text-zinc-600 hover:text-red-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
          <button onClick={() => setImages([...images, ''])} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-colors ml-1">
            <Plus className="w-3 h-3" /> Añadir otro link
          </button>
        </div>
      </div>

      <button 
        onClick={handleSubmit}
        disabled={loading}
        className={`w-full py-5 text-black font-black uppercase tracking-[0.2em] rounded-[2rem] transition-all active:scale-95 disabled:opacity-50 shadow-xl ${formType === 'mision' ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-500/20' : formType === 'combate' ? 'bg-red-600 hover:bg-red-500 shadow-red-500/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'}`}
      >
        {loading ? 'Procesando...' : 'Publicar Registro'}
      </button>
    </div>
  );
}
