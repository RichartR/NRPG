'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  User, Shield, Briefcase, Zap, Save, RefreshCw, ArrowLeft, UserPlus
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CrearFichaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

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

  const [aldeas, setAldeas] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('aldeas').select('*').eq('activo', true).then(({ data }) => {
      if (data) setAldeas(data);
    });
  }, []);

  const handleCreate = async () => {
    if (!character.nombre_ninja || !character.hobba_name) return alert('Nombre y Hobba Name son obligatorios');
    
    setLoading(true);
    try {
      const { data, error } = await supabase.from('characters').insert({
        hobba_name: character.hobba_name,
        nombre_ninja: character.nombre_ninja,
        aldea_id: character.aldea_id || null,
        rango: character.rango,
        rango_jerarquico: character.rango_jerarquico,
        stats_base: character.stats_base,
        atributos_derivados: character.atributos_derivados,
        puntos_stats: character.puntos_stats,
        sexo: character.sexo,
        edad: character.edad
      }).select().single();

      if (error) throw error;

      // Al crear, la API de Supabase Triggers o nuestro flow ya debería inicializar Discord
      // Pero por ahora, redirigimos a la ficha recién creada
      router.push(`/ficha/${data.id}`);
    } catch (err) {
      console.error(err);
      alert('Error al crear el personaje');
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
