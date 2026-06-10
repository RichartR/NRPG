'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToastStore } from '@/components/ui/Toast';
import { useMasterStore } from '@/store/useMasterStore';
import { CharacterSheetView } from '@/components/character/CharacterSheetView';
import { CharacterStats } from '@/domain/types';
import { StatsLogic } from '@/domain/character/logic';
import { MasterService } from '@/services/supabase/master.service';

function CrearFichaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const masters = useMasterStore();
  const addToast = useToastStore(state => state.addToast);

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [glosarioCompleto, setGlosarioCompleto] = useState<any[]>([]);
  
  const [form, setForm] = useState<any>({
    nombre_ninja: '',
    hobba_name: '',
    aldea_id: searchParams.get('aldea_id') ? Number(searchParams.get('aldea_id')) : null,
    rango: '',
    rango_jerarquico: 'Genin',
    puntos_stats: 0,
    xp: 0,
    ryous: 0,
    moneda_evento: 0,
    edad: 12,
    sexo: 'Masculino',
    tiempo_rpg: '',
    apariencia: '',
    historia: '',
    stats_base: { NIN: 0, TAI: 0, GEN: 0, INT: 0, FUE: 0, AGI: 0, EST: 0, SM: 0 },
    atributos_derivados: { VIT: 0, CH: 0, VEL: 0, RES: 0, VR: 0, DET: 0 },
    personajes_inventario: [],
    personajes_tecnicas: [],
    personajes_ramas: [
      { slot: 1, rama_id: null, sub_especialidad_id: null },
      { slot: 2, rama_id: null, sub_especialidad_id: null }
    ],
    profiles: { username: '...' }
  });

  useEffect(() => {
    if (!masters.initialized) masters.initialize();
    
    // Cargar perfil del usuario logueado para mostrar su Discord
    const loadData = async () => {
      const { data: { user } } = await (await import('@/services/supabase/auth.service')).AuthService.getUser();
      if (user) {
        const profile = await (await import('@/services/supabase/profile.service')).ProfileService.getProfile(user.id);
        if (profile) {
          setForm((prev: any) => ({ ...prev, profiles: { username: profile.username } }));
        }
      }

      // Cargar configuración inicial del sistema
      try {
        const { AdminService } = await import('@/services/supabase/admin.service');
        const [config, fullGlosario] = await Promise.all([
          AdminService.getConfigByClave('datos_inicio_ficha'),
          MasterService.getGlosarios()
        ]);
        if (config && config.valor) {
          setForm((prev: any) => ({
            ...prev,
            ...config.valor,
            rango_jerarquico: config.valor.rango_jerarquico || prev.rango_jerarquico || 'Genin',
            stats_base: config.valor.stats_base || prev.stats_base,
            atributos_derivados: config.valor.atributos_derivados || prev.atributos_derivados
          }));
        }
        if (fullGlosario) {
          setGlosarioCompleto(fullGlosario);
        }
      } catch (err) {
        console.error('Error loading initial config or glossary:', err);
      } finally {
        setInitialDataLoaded(true);
      }
    };
    loadData();
  }, []);

  const equipedRamaIdsStr = JSON.stringify(
    form.personajes_ramas.map((r: any) => ({
      rama_id: r.rama_id,
      p: r.elemento_principal_id,
      s: r.elemento_secundario_id,
      t: r.elemento_terciario_id
    }))
  );
  const initialReqsStr = JSON.stringify({
    rango: form.rango || '',
    pa: form.puntos_aprendizaje || 0,
    misiones: form.misiones || 0,
    stats: form.stats_base || {}
  });

  useEffect(() => {
    if (initialDataLoaded && glosarioCompleto.length > 0) {
      const equipedRamaIds = form.personajes_ramas
        .map((r: any) => r.rama_id ? Number(r.rama_id) : null)
        .filter(Boolean);

      const equipedElementIds = form.personajes_ramas
        .reduce((acc: number[], r: any) => {
          if (r.elemento_principal_id) acc.push(Number(r.elemento_principal_id));
          if (r.elemento_secundario_id) acc.push(Number(r.elemento_secundario_id));
          if (r.elemento_terciario_id) acc.push(Number(r.elemento_terciario_id));
          return acc;
        }, []);

      const RANGO_ORDER = ['D', 'C', 'B', 'A', 'S'];
      const charRango = form.rango || '';
      const charPA = form.puntos_aprendizaje || 0;
      const charMisiones = form.misiones || 0;
      const charStats = form.stats_base || {};

      const meetsAllReqs = (entry: any): boolean => {
        const reqs = entry.requisitos;

        // Validar Rama
        const requiredRamaId = entry.rama_clan_id || reqs?.rama_id;
        if (requiredRamaId && !equipedRamaIds.includes(Number(requiredRamaId))) return false;

        // Validar Elemento
        const requiredElementId = entry.elemento_id || reqs?.elemento_id;
        if (requiredElementId && !equipedElementIds.includes(Number(requiredElementId))) return false;

        if (reqs) {
          // Validar Rango
          if (reqs.rango) {
            const charRangoIdx = RANGO_ORDER.indexOf(charRango);
            const reqRangoIdx = RANGO_ORDER.indexOf(reqs.rango);
            if (charRangoIdx < reqRangoIdx) return false;
          }

          // Validar Puntos de Aprendizaje
          if (reqs.combates && charPA < Number(reqs.combates)) return false;

          // Validar Misiones
          if (reqs.misiones && charMisiones < Number(reqs.misiones)) return false;

          // Validar Stats
          if (reqs.stats) {
            for (const statKey in reqs.stats) {
              const reqVal = Number(reqs.stats[statKey]);
              if (reqVal > 0) {
                const charVal = Number(charStats[statKey.toUpperCase() as keyof typeof charStats] || 0);
                if (charVal < reqVal) return false;
              }
            }
          }
        }

        return true;
      };

      const ninjutsuRama = form.personajes_ramas.find((r: any) => Number(r.rama_id) === 4);
      let isNinIIorIII = false;
      if (ninjutsuRama && ninjutsuRama.sub_especialidad_id) {
        const sub = (masters.subEspecialidades || []).find((s: any) => s.id === ninjutsuRama.sub_especialidad_id);
        if (sub && (sub.slug === 'ninjutsu-ii' || sub.slug === 'ninjutsu-iii')) {
          isNinIIorIII = true;
        }
      }

      const initialItems = glosarioCompleto
        .filter((i: any) => i.inicial && i.categoria_id === 2 && meetsAllReqs(i))
        .map((i: any) => ({ item_id: i.id, cantidad: 1, info_glosario: i }));
      
      const initialTecs = glosarioCompleto
        .filter((t: any) => {
          if (t.inicial && t.categoria_id !== 2 && meetsAllReqs(t)) {
            if (isNinIIorIII && Number(t.rama_clan_id) === 4) {
              return false;
            }
            return true;
          }
          return false;
        })
        .map((t: any) => ({ tecnica_id: t.id, info_glosario: t }));

      setForm((prev: any) => ({
        ...prev,
        personajes_inventario: initialItems,
        personajes_tecnicas: initialTecs
      }));
    }
  }, [initialDataLoaded, glosarioCompleto, equipedRamaIdsStr, initialReqsStr, form.personajes_ramas]);

  // Recalcular atributos derivados cuando cambian los stats
  useEffect(() => {
    if (masters.rangoRules && masters.escaladoRules) {
      const bases = masters.rangoRules[form.rango];
      const escalado = masters.escaladoRules;
      
      if (bases && escalado) {
        const nuevosDerivados = StatsLogic.calculateDerivedStats(form.stats_base, bases, escalado);
        setForm((prev: any) => ({ ...prev, atributos_derivados: nuevosDerivados }));
      }
    }
  }, [form.stats_base, form.rango, masters.initialized, masters.rangoRules, masters.escaladoRules]);

  const updateField = (field: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const updateStat = (stat: keyof CharacterStats, value: number) => {
    if (!masters.rangoRules) return;

    const validation = StatsLogic.validateStatChange(
      stat,
      value,
      form.stats_base,
      form.rango,
      form.puntos_stats,
      masters.rangoRules
    );

    if (validation.valid) {
      setForm((prev: any) => ({
        ...prev,
        stats_base: { ...prev.stats_base, [stat]: value }
      }));
    } else if (validation.message) {
      addToast(validation.message, 'error');
    }
  };

  const handleCreate = async () => {
    if (!form.nombre_ninja.trim()) return addToast('Nombre ninja obligatorio', 'error');
    if (!form.hobba_name.trim()) return addToast('Usuario Hobba obligatorio', 'error');
    if (!form.aldea_id) return addToast('Selecciona una aldea', 'error');

    setLoading(true);
    try {
      // 1. Obtener las IDs de las ramas equipadas por el personaje en el formulario
      const equipedRamaIds = form.personajes_ramas
        .map((r: any) => r.rama_id ? Number(r.rama_id) : null)
        .filter(Boolean);

      const equipedElementIds = form.personajes_ramas
        .reduce((acc: number[], r: any) => {
          if (r.elemento_principal_id) acc.push(Number(r.elemento_principal_id));
          if (r.elemento_secundario_id) acc.push(Number(r.elemento_secundario_id));
          if (r.elemento_terciario_id) acc.push(Number(r.elemento_terciario_id));
          return acc;
        }, []);

      // 2. Filtrar las técnicas iniciales según las ramas y elementos elegidos
      const filteredTecnicas = form.personajes_tecnicas.filter((pt: any) => {
        const t = pt.info_glosario;
        if (!t) return true;
        
        // Validar Rama
        const requiredRamaId = t.rama_clan_id || t.requisitos?.rama_id;
        if (requiredRamaId && !equipedRamaIds.includes(Number(requiredRamaId))) {
          return false;
        }

        // Validar Elemento
        const requiredElementId = t.elemento_id || t.requisitos?.elemento_id;
        if (requiredElementId && !equipedElementIds.includes(Number(requiredElementId))) {
          return false;
        }

        return true;
      });

      const payload = {
        ...form,
        personajes_ramas: form.personajes_ramas.filter((r: any) => r.rama_id !== null),
        personajes_tecnicas: filteredTecnicas
      };
      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: payload }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al crear');
      }
      
      const { id } = await res.json();
      addToast('¡Ficha creada con éxito!', 'success');
      router.push(`/ficha/${id}`);
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!initialDataLoaded) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 border-4 border-oro/10 border-t-oro rounded-full animate-spin mb-8" />
        <h2 className="text-oro font-black uppercase tracking-[0.4em] text-xs xl:text-sm animate-pulse text-center">
          INVOCANDO EXPEDIENTE <span className="text-oro/40 italic">NINJA</span>...
        </h2>
      </div>
    );
  }

  return (
    <CharacterSheetView 
      character={form}
      masters={masters}
      glosarioFiltrado={glosarioCompleto}
      isEditing={false}
      canEdit={true}
      activeTab={activeTab}
      saving={loading}
      isNew={true}
      onUpdateField={updateField}
      onUpdateStat={updateStat}
      onSave={handleCreate}
      onCancel={() => router.back()}
      onSetActiveTab={setActiveTab}
      onBack={() => router.back()}
    />
  );
}

export default function CrearFichaPage() {
  return (
    <Suspense>
      <CrearFichaContent />
    </Suspense>
  );
}
