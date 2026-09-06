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
    
    // Cargar perfil del usuario logueado para mostrar su Discord, configuración inicial y glosario en paralelo
    const loadData = async () => {
      try {
        const [
          { AuthService },
          { AdminService }
        ] = await Promise.all([
          import('@/services/supabase/auth.service'),
          import('@/services/supabase/admin.service')
        ]);

        const [userRes, config, fullGlosario] = await Promise.all([
          AuthService.getUser(),
          AdminService.getConfigByClave('datos_inicio_ficha'),
          MasterService.getGlosarios()
        ]);

        const user = userRes.data?.user;
        if (user) {
          const { ProfileService } = await import('@/services/supabase/profile.service');
          const profile = await ProfileService.getProfile(user.id);
          if (profile) {
            setForm((prev: any) => ({ ...prev, profiles: { username: profile.username } }));
          }
        }

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
      sub_especialidad_id: r.sub_especialidad_id,
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

      if (form.eleccion_tecnicas_clan?.rama_id) {
        equipedRamaIds.push(Number(form.eleccion_tecnicas_clan.rama_id));
      }

      const equipedSubSpecIds = form.personajes_ramas
        .map((r: any) => r.sub_especialidad_id ? Number(r.sub_especialidad_id) : null)
        .filter(Boolean);

      if (form.eleccion_tecnicas_clan?.sub_especialidad_id) {
        equipedSubSpecIds.push(Number(form.eleccion_tecnicas_clan.sub_especialidad_id));
      }

      const equipedElementIds: number[] = [];
      form.personajes_ramas.forEach((r: any) => {
        if (r.elemento_principal_id) equipedElementIds.push(Number(r.elemento_principal_id));
        if (r.elemento_secundario_id) equipedElementIds.push(Number(r.elemento_secundario_id));
        if (r.elemento_terciario_id) equipedElementIds.push(Number(r.elemento_terciario_id));

        if (r.rama_id && masters.ramaElementos) {
          masters.ramaElementos
            .filter((re: any) => Number(re.rama_id) === Number(r.rama_id) && re.tipo === 'fijo')
            .forEach((re: any) => {
              if (re.elemento_id) equipedElementIds.push(Number(re.elemento_id));
            });
        }
      });

      if (form.eleccion_tecnicas_clan?.sub_especialidad_id) {
        const sub = (masters.subEspecialidades || []).find((s: any) => s.id === Number(form.eleccion_tecnicas_clan.sub_especialidad_id));
        if (sub) {
          const elem = (masters.elementos || []).find((el: any) => {
            const clean = (str: string) => (str || '').toLowerCase().replace(/uu/g, 'u').trim();
            return clean(sub.slug) === clean(el.nombre_jap) ||
              clean(sub.nombre) === clean(el.nombre_esp) ||
              clean(sub.nombre) === clean(el.nombre_jap);
          });
          if (elem) equipedElementIds.push(Number(elem.id));
        }
      }

      const RANGO_ORDER = ['D', 'C', 'B', 'A', 'S'];
      const charRango = form.rango || 'D';
      const charPA = form.puntos_aprendizaje || 0;
      const charMisiones = form.misiones || 0;
      const charStats = form.stats_base || {};

      const meetsAllReqs = (entry: any): boolean => {
        const reqs = entry.requisitos;

        // Validar Rama
        const requiredRamaId = entry.rama_clan_id || reqs?.rama_id;
        if (requiredRamaId && !equipedRamaIds.includes(Number(requiredRamaId))) return false;

        // Validar Sub-Especialidad
        const requiredSubSpec = entry.sub_especialidad_id ?? reqs?.sub_especialidad_id;
        if (requiredSubSpec !== null && requiredSubSpec !== undefined) {
          if (Array.isArray(requiredSubSpec)) {
            const hasAnySub = requiredSubSpec.some((subId: any) => equipedSubSpecIds.includes(Number(subId)));
            if (!hasAnySub) return false;
          } else {
            if (!equipedSubSpecIds.includes(Number(requiredSubSpec))) return false;
          }
        }

        // Validar Elemento
        const requiredElementId = entry.elemento_id || reqs?.elemento_id;
        if (requiredElementId) {
          const reqElId = Number(requiredElementId);
          const isNinjutsuTech = Number(entry.rama_clan_id || reqs?.rama_id) === 4;
          if (isNinjutsuTech) {
            // Buscamos el slot de Ninjutsu Elemental o de un Clan Elemental
            const ninjutsuSlot = form.personajes_ramas.find((r: any) => {
              if (Number(r.rama_id) === 4) return true;
              const clanInfo = (masters.ramas || []).find((cr: any) => cr.id === Number(r.rama_id));
              return clanInfo?.config_iniciales?.clan_elemental === true;
            });
            const ninElements: number[] = [];
            if (ninjutsuSlot) {
              const clanInfo = (masters.ramas || []).find((cr: any) => cr.id === Number(ninjutsuSlot.rama_id));
              const isClanElemental = clanInfo?.config_iniciales?.clan_elemental === true;
              if (isClanElemental) {
                if (masters.ramaElementos) {
                  masters.ramaElementos
                    .filter((re: any) => Number(re.rama_id) === Number(ninjutsuSlot.rama_id) && re.tipo === 'fijo')
                    .forEach((re: any) => {
                      if (re.elemento_id) ninElements.push(Number(re.elemento_id));
                    });
                }
              } else {
                if (ninjutsuSlot.elemento_principal_id) ninElements.push(Number(ninjutsuSlot.elemento_principal_id));
                if (ninjutsuSlot.elemento_secundario_id) ninElements.push(Number(ninjutsuSlot.elemento_secundario_id));
                if (ninjutsuSlot.elemento_terciario_id) ninElements.push(Number(ninjutsuSlot.elemento_terciario_id));
              }
            }

            // Ninjutsu obtenido por compatibilidad de clan
            if (form.eleccion_tecnicas_clan && Number(form.eleccion_tecnicas_clan.rama_id) === 4) {
              if (form.eleccion_tecnicas_clan.sub_especialidad_id) {
                const sub = (masters.subEspecialidades || []).find((s: any) => s.id === Number(form.eleccion_tecnicas_clan.sub_especialidad_id));
                if (sub) {
                  const elem = (masters.elementos || []).find((el: any) => {
                    const clean = (str: string) => (str || '').toLowerCase().replace(/uu/g, 'u').trim();
                    return clean(sub.slug) === clean(el.nombre_jap) ||
                      clean(sub.nombre) === clean(el.nombre_esp) ||
                      clean(sub.nombre) === clean(el.nombre_jap);
                  });
                  if (elem) ninElements.push(Number(elem.id));
                }
              }
            }

            // Elementos fijados por clan
            form.personajes_ramas.forEach((r: any) => {
              if (r.rama_id && masters.ramaElementos) {
                masters.ramaElementos
                  .filter((re: any) => Number(re.rama_id) === Number(r.rama_id) && re.tipo === 'fijo')
                  .forEach((re: any) => {
                    if (re.elemento_id) ninElements.push(Number(re.elemento_id));
                  });
              }
            });

            if (!ninElements.includes(reqElId)) return false;
          } else {
            if (!equipedElementIds.includes(reqElId)) return false;
          }
        }

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
          if (reqs.misiones && typeof reqs.misiones === 'object') {
            for (const [rank, count] of Object.entries(reqs.misiones)) {
              const reqCount = Number(count);
              if (isNaN(reqCount) || reqCount <= 0) continue;
              if (charMisiones < reqCount) return false;
            }
          }

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
      let isNinIIorIIIInBranch = false;
      if (ninjutsuRama && ninjutsuRama.sub_especialidad_id) {
        const sub = (masters.subEspecialidades || []).find((s: any) => s.id === ninjutsuRama.sub_especialidad_id);
        if (sub && (sub.slug === 'ninjutsu-ii' || sub.slug === 'ninjutsu-iii')) {
          isNinIIorIIIInBranch = true;
        }
      }
      const clanEleccion = form.eleccion_tecnicas_clan;
      let isNinIIorIIIInClan = false;
      if (clanEleccion?.sub_especialidad_id && Number(clanEleccion.rama_id) === 4) {
        const sub = (masters.subEspecialidades || []).find((s: any) => s.id === Number(clanEleccion.sub_especialidad_id));
        if (sub && (sub.slug === 'ninjutsu-ii' || sub.slug === 'ninjutsu-iii')) {
          isNinIIorIIIInClan = true;
        }
      }
      const isNinIIorIII = isNinIIorIIIInBranch || isNinIIorIIIInClan;

      const initialItems = glosarioCompleto
        .filter((i: any) => i.inicial && i.obtenible !== false && i.categoria_id === 2 && meetsAllReqs(i))
        .map((i: any) => ({ item_id: i.id, cantidad: 1, info_glosario: i, equipado: false }));
      
      // Check if they have an elemental clan
      const clanElementalRama = form.personajes_ramas.find((r: any) => {
        const clanInfo = (masters.ramas || []).find((cr: any) => cr.id === Number(r.rama_id));
        return clanInfo?.config_iniciales?.clan_elemental === true;
      });
      const isClanElemental = !!clanElementalRama;

      const initialTecs = glosarioCompleto
        .filter((t: any) => {
          if (t.inicial && t.obtenible !== false && t.categoria_id !== 2 && meetsAllReqs(t)) {
            if (isNinIIorIII && Number(t.rama_clan_id) === 4) {
              return false;
            }
            if (isClanElemental) {
              const reqElId = t.elemento_id || t.requisitos?.elemento_id;
              if (reqElId) {
                if (ninjutsuRama && Number(ninjutsuRama.sub_especialidad_id) === 9) { // Ninjutsu I
                  const ninElementId = Number(ninjutsuRama.elemento_principal_id);
                  if (Number(reqElId) === ninElementId) {
                    return true;
                  }
                }
                return false;
              }
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
  }, [initialDataLoaded, glosarioCompleto, equipedRamaIdsStr, initialReqsStr, form.personajes_ramas, form.eleccion_tecnicas_clan]);

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

    const rama1 = form.personajes_ramas?.find((r: any) => Number(r.slot) === 1)?.rama_id;
    const rama2 = form.personajes_ramas?.find((r: any) => Number(r.slot) === 2)?.rama_id;
    if (!rama1 || !rama2) return addToast('Debes seleccionar las dos ramas obligatoriamente', 'error');

    setLoading(true);
    try {
      // 1. Obtener las IDs de las ramas equipadas por el personaje en el formulario
      const equipedRamaIds = form.personajes_ramas
        .map((r: any) => r.rama_id ? Number(r.rama_id) : null)
        .filter(Boolean);

      if (form.eleccion_tecnicas_clan?.rama_id) {
        equipedRamaIds.push(Number(form.eleccion_tecnicas_clan.rama_id));
      }

      const equipedSubSpecIds = form.personajes_ramas
        .map((r: any) => r.sub_especialidad_id ? Number(r.sub_especialidad_id) : null)
        .filter(Boolean);

      if (form.eleccion_tecnicas_clan?.sub_especialidad_id) {
        equipedSubSpecIds.push(Number(form.eleccion_tecnicas_clan.sub_especialidad_id));
      }

      const equipedElementIds: number[] = [];
      form.personajes_ramas.forEach((r: any) => {
        if (r.elemento_principal_id) equipedElementIds.push(Number(r.elemento_principal_id));
        if (r.elemento_secundario_id) equipedElementIds.push(Number(r.elemento_secundario_id));
        if (r.elemento_terciario_id) equipedElementIds.push(Number(r.elemento_terciario_id));

        if (r.rama_id && masters.ramaElementos) {
          masters.ramaElementos
            .filter((re: any) => Number(re.rama_id) === Number(r.rama_id) && re.tipo === 'fijo')
            .forEach((re: any) => {
              if (re.elemento_id) equipedElementIds.push(Number(re.elemento_id));
            });
        }
      });

      if (form.eleccion_tecnicas_clan?.sub_especialidad_id) {
        const sub = (masters.subEspecialidades || []).find((s: any) => s.id === Number(form.eleccion_tecnicas_clan.sub_especialidad_id));
        if (sub) {
          const elem = (masters.elementos || []).find((el: any) => {
            const clean = (str: string) => (str || '').toLowerCase().replace(/uu/g, 'u').trim();
            return clean(sub.slug) === clean(el.nombre_jap) ||
              clean(sub.nombre) === clean(el.nombre_esp) ||
              clean(sub.nombre) === clean(el.nombre_jap);
          });
          if (elem) equipedElementIds.push(Number(elem.id));
        }
      }

      // 2. Filtrar las técnicas iniciales según las ramas, subespecialidades y elementos elegidos
      const filteredTecnicas = form.personajes_tecnicas.filter((pt: any) => {
        const t = pt.info_glosario;
        if (!t) return true;
        
        // Validar Rama
        const requiredRamaId = t.rama_clan_id || t.requisitos?.rama_id;
        if (requiredRamaId && !equipedRamaIds.includes(Number(requiredRamaId))) {
          return false;
        }

        // Validar Sub-Especialidad
        const requiredSubSpec = t.sub_especialidad_id ?? t.requisitos?.sub_especialidad_id;
        if (requiredSubSpec !== null && requiredSubSpec !== undefined) {
          if (Array.isArray(requiredSubSpec)) {
            const hasAnySub = requiredSubSpec.some((subId: any) => equipedSubSpecIds.includes(Number(subId)));
            if (!hasAnySub) return false;
          } else {
            if (!equipedSubSpecIds.includes(Number(requiredSubSpec))) return false;
          }
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
