'use client';

import { useState, useEffect } from 'react';
import { 
  User, Shield, Briefcase, Zap, Save, RefreshCw, ArrowLeft, UserPlus
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToastStore } from '@/components/ui/Toast';
import { CharacterService } from '@/services/supabase/character.service';
import { useMasterStore } from '@/store/useMasterStore';

export default function CrearFichaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const masters = useMasterStore();

  const [loading, setLoading] = useState(false);
  const [character, setCharacter] = useState<any>({
    hobba_name: '',
    nombre_ninja: '',
    aldea_id: searchParams.get('aldea_id') ? Number(searchParams.get('aldea_id')) : '',
    rango: 'D',
    rango_jerarquico: 'Estudiante',
    stats_base: { NIN: 1, TAI: 1, GEN: 1, INT: 1, FUE: 1, AGI: 1, EST: 1, SM: 1 },
    atributos_derivados: { VIT: 600, CH: 0, VEL: 5, RES: 0, VR: 1, DET: 1 },
    puntos_stats: 8,
    xp: 0,
    edad: '',
    sexo: 'Masculino',
    personajes_inventario: [],
    personajes_tecnicas: [],
    personajes_ramas: []
  });

  const aldeas = masters.aldeas || [];
  const addToast = useToastStore(state => state.addToast);

  useEffect(() => {
    if (!masters.initialized) masters.initialize();
  }, []);

  const handleCreate = async () => {
    // Validaciones robustas
    if (!character.nombre_ninja?.trim()) {
      return addToast('El nombre del personaje es obligatorio', 'error');
    }
    if (character.nombre_ninja.trim().length < 3) {
      return addToast('El nombre es demasiado corto', 'error');
    }
    if (!character.hobba_name?.trim()) {
      return addToast('El nombre de usuario Hobba es obligatorio', 'error');
    }
    
    setLoading(true);
    try {
      const data = await CharacterService.createCharacter(character);
      addToast('¡Personaje inicializado con éxito!', 'success');
      router.push(`/ficha/${data.id}`);
    } catch (err) {
      console.error(err);
      addToast('Error al crear el personaje', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-12">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-4 text-xs font-black uppercase tracking-widest group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver
          </button>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter flex items-center gap-4">
            <UserPlus className="w-10 h-10 text-emerald-500" />
            Nuevo Shinobi
          </h1>
        </header>

        <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-8 space-y-8 backdrop-blur-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nombre del Personaje</label>
              <input 
                value={character.nombre_ninja}
                onChange={(e) => setCharacter({...character, nombre_ninja: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white outline-none focus:border-emerald-500 transition-all"
                placeholder="Ej: Naruto Uzumaki"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Usuario Hobba</label>
              <input 
                value={character.hobba_name}
                onChange={(e) => setCharacter({...character, hobba_name: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white outline-none focus:border-emerald-500 transition-all"
                placeholder="Ej: Naruto99"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Aldea Inicial</label>
              <select 
                value={character.aldea_id}
                onChange={(e) => setCharacter({...character, aldea_id: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white outline-none focus:border-emerald-500 transition-all appearance-none"
              >
                <option value="">Seleccionar Aldea...</option>
                {aldeas.map(a => <option key={a.id} value={a.id}>{a.nombre_completo}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Rango</label>
              <select 
                value={character.rango}
                onChange={(e) => setCharacter({...character, rango: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white outline-none focus:border-emerald-500 transition-all appearance-none"
              >
                {['D', 'C', 'B', 'A', 'S'].map(r => <option key={r} value={r}>Rango {r}</option>)}
              </select>
            </div>
          </div>

          <button 
            onClick={handleCreate}
            disabled={loading}
            className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-black font-black uppercase tracking-[0.2em] rounded-[2rem] transition-all shadow-xl shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-6 h-6 animate-spin mx-auto" /> : 'Inicializar Personaje'}
          </button>
        </div>
      </div>
    </div>
  );
}
