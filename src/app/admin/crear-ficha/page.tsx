'use client';

import { useState, useEffect, Suspense } from 'react';
import { RefreshCw, UserPlus, Link } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToastStore } from '@/components/ui/Toast';
import { CharacterService } from '@/services/supabase/character.service';
import { useMasterStore } from '@/store/useMasterStore';
import { NinjaSelect } from '@/components/ui/Fields';

function CrearFichaAdminContent() {
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
    <div className="max-w-[1750px]">
      <header className="mb-6 ninja-card-oro p-8 xl:p-10">
        <Link href="/admin" className="flex items-center gap-3 text-oro/40 hover:text-oro transition-all mb-8 text-caption font-black uppercase tracking-[0.3em] group">
          <div className="w-1.5 h-1.5 bg-oro/20 group-hover:bg-oro rotate-45 transition-colors" />
          VOLVER AL PANEL CENTRAL
        </Link>

        <div className="flex items-center gap-6">
          <div className="w-12 h-12 bg-oro/[0.03] border border-oro/10 flex items-center justify-center">
            <UserPlus className="w-6 h-6 text-oro" />
          </div>
          <div>
            <h1 className="ninja-title text-4xl xl:text-5xl italic">CREAR SHINOBI</h1>
            <p className="text-oro/40 text-caption xl:text-xs font-black uppercase tracking-[0.4em] mt-2">REGISTRO DE NUEVOS PERSONAJES EN EL SISTEMA</p>
          </div>
        </div>
      </header>

      <div className="ninja-card-oro p-10 xl:p-12 space-y-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-oro/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-caption font-black uppercase tracking-[0.4em] text-oro/30 ml-2">Nombre del Personaje</label>
            <input
              value={character.nombre_ninja}
              onChange={(e) => setCharacter({ ...character, nombre_ninja: e.target.value })}
              className="w-full bg-black/40 border border-oro/10 py-5 px-8 text-oro font-bold outline-none focus:border-oro/40 transition-all placeholder:text-oro/10 text-sm ninja-clip-md"
              placeholder="EJ: NARUTO UZUMAKI"
            />
          </div>
          <div className="space-y-3">
            <label className="text-caption font-black uppercase tracking-[0.4em] text-oro/30 ml-2">Usuario Hobba</label>
            <input
              value={character.hobba_name}
              onChange={(e) => setCharacter({ ...character, hobba_name: e.target.value })}
              className="w-full bg-black/40 border border-oro/10 py-5 px-8 text-oro font-bold outline-none focus:border-oro/40 transition-all placeholder:text-oro/10 text-sm ninja-clip-md"
              placeholder="EJ: NARUTO99"
            />
          </div>
          <div className="space-y-3">
            <label className="text-caption font-black uppercase tracking-[0.4em] text-oro/30 ml-2">Aldea Inicial</label>
            <NinjaSelect
              value={character.aldea_id}
              onChange={(val) => setCharacter({ ...character, aldea_id: val })}
              placeholder="SELECCIONAR NACIÓN..."
              options={aldeas.map(a => ({ label: a.nombre_completo.toUpperCase(), value: a.id }))}
            />
          </div>
          <div className="space-y-3">
            <label className="text-caption font-black uppercase tracking-[0.4em] text-oro/30 ml-2">Rango</label>
            <NinjaSelect
              value={character.rango}
              onChange={(val) => setCharacter({ ...character, rango: val })}
              placeholder="SELECCIONAR RANGO..."
              options={['D', 'C', 'B', 'A', 'S'].map(r => ({ label: `RANGO ${r}`, value: r }))}
            />
          </div>
          <div className="space-y-3 md:col-span-2">
            <label className="text-caption font-black uppercase tracking-[0.4em] text-oro/30 ml-2">URL de Imagen del Personaje (OPCIONAL)</label>
            <input
              value={character.url_img || ''}
              onChange={(e) => setCharacter({ ...character, url_img: e.target.value })}
              className="w-full bg-black/40 border border-oro/10 py-5 px-8 text-oro font-bold outline-none focus:border-oro/40 transition-all placeholder:text-oro/10 text-sm ninja-clip-md"
              placeholder="HTTPS://..."
            />
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full py-6 bg-oro text-rojo-sangre font-black uppercase tracking-[0.3em] transition-all shadow-xl shadow-oro/5 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 hover:brightness-110 ninja-clip-md"
        >
          {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : (
            <>
              <UserPlus className="w-5 h-5" />
              <span>CREAR REGISTRO NINJA</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function CrearFichaPage() {
  return (
    <Suspense>
      <CrearFichaAdminContent />
    </Suspense>
  );
}
