'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToastStore } from '@/components/ui/Toast';
import { useMasterStore } from '@/store/useMasterStore';
import { CharacterSheetView } from '@/components/character/CharacterSheetView';
import { CharacterStats } from '@/domain/types';
import { StatsLogic } from '@/domain/character/logic';

export default function CrearFichaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const masters = useMasterStore();
  const addToast = useToastStore(state => state.addToast);

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  
  const [form, setForm] = useState<any>({
    nombre_ninja: '',
    hobba_name: '',
    aldea_id: searchParams.get('aldea_id') ? Number(searchParams.get('aldea_id')) : null,
    rango: 'D',
    rango_jerarquico: 'Estudiante',
    puntos_stats: 16,
    xp: 0,
    ryous: 0,
    edad: 18,
    sexo: 'Masculino',
    tiempo_rpg: '',
    apariencia: '',
    historia: '',
    stats_base: { NIN: 1, TAI: 1, GEN: 1, INT: 1, FUE: 1, AGI: 1, EST: 1, SM: 1 },
    atributos_derivados: { VIT: 600, CH: 0, VEL: 5, RES: 0, VR: 1, DET: 1 },
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
    const loadProfile = async () => {
      const { data: { user } } = await (await import('@/services/supabase/auth.service')).AuthService.getUser();
      if (user) {
        const profile = await (await import('@/services/supabase/profile.service')).ProfileService.getProfile(user.id);
        if (profile) {
          setForm((prev: any) => ({ ...prev, profiles: { username: profile.username } }));
        }
      }
    };
    loadProfile();
  }, []);

  // Cargar elementos iniciales cuando los masters estén listos (solo una vez)
  useEffect(() => {
    if (masters.initialized && !initialDataLoaded && masters.glosario) {
      const initialItems = masters.glosario
        .filter((i: any) => i.inicial && i.categoria_id === 2)
        .map((i: any) => ({ item_id: i.id, cantidad: 1, info_glosario: i }));
      
      const initialTecs = masters.glosario
        .filter((t: any) => t.inicial && t.categoria_id !== 2)
        .map((t: any) => ({ tecnica_id: t.id, info_glosario: t }));

      setForm((prev: any) => ({
        ...prev,
        personajes_inventario: initialItems,
        personajes_tecnicas: initialTecs,
        ryous: masters.recursosPJInicio?.ryous_iniciales ?? 0,
        xp: masters.recursosPJInicio?.xp_inicial ?? 0
      }));
      
      setInitialDataLoaded(true);
    }
  }, [masters.initialized, masters.glosario, masters.recursosPJInicio, initialDataLoaded]);

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
      const payload = {
        ...form,
        personajes_ramas: form.personajes_ramas.filter((r: any) => r.rama_id !== null)
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

  return (
    <CharacterSheetView 
      character={form}
      masters={masters}
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
