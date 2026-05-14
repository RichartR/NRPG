import { useState, useEffect } from 'react';
import { CharacterService } from '@/services/supabase/character.service';
import { StatsLogic } from '@/domain/character/logic';
import { Character, CharacterStats } from '@/domain/types';
import { useMasterStore } from '@/store/useMasterStore';
import { AuthService } from '@/services/supabase/auth.service';
import { ProfileService } from '@/services/supabase/profile.service';
import { useToastStore } from '@/components/ui/Toast';

export function useCharacter(characterId: string) {
  const [character, setCharacter] = useState<Character | null>(null);
  const [originalCharacter, setOriginalCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Master data from Store
  const masters = useMasterStore();
  const addToast = useToastStore(state => state.addToast);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('edit') === 'true') {
      setIsEditing(true);
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Ensure master data is loaded
      if (!masters.initialized) {
        await masters.initialize();
      }
      
      const { data: { user } } = await AuthService.getUser();
      
      const char = await CharacterService.getCharacterById(characterId);

      // Permission check
      let isAdm = false;
      if (user) {
        const profile = await ProfileService.getProfile(user.id);
        isAdm = profile?.role === 'admin';
      }
      setIsAdmin(isAdm);
      setCanEdit(!!(isAdm || (user && char.user_id === user.id)));

      // Parallel Discord data fetch
      const [aparienciaMsg, historiaMsg] = await Promise.all([
        char.apariencia_msg_id 
          ? fetch(`/api/discord/messages?messageId=${char.apariencia_msg_id}`).then(r => r.json()).catch(() => ({}))
          : Promise.resolve({}),
        char.historia_msg_id 
          ? fetch(`/api/discord/messages?messageId=${char.historia_msg_id}`).then(r => r.json()).catch(() => ({}))
          : Promise.resolve({})
      ]);

      const aparienciaTexto = aparienciaMsg?.content ? aparienciaMsg.content.split('\n').slice(1).join('\n') : '';
      const historiaTexto = historiaMsg?.content ? historiaMsg.content.split('\n').slice(1).join('\n') : '';

      const fullChar = { ...char, apariencia: aparienciaTexto, historia: historiaTexto };
      setCharacter(fullChar);
      setOriginalCharacter(JSON.parse(JSON.stringify(fullChar)));
    } catch (err: any) {
      addToast(`Error al cargar: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [characterId]);

  // Derived Stats Effect
  useEffect(() => {
    if (!character || !masters.escaladoRules || !masters.rangoRules) return;
    
    const bases = masters.rangoRules[character.rango];
    if (!bases) return;

    const newDerivados = StatsLogic.calculateDerivedStats(
      character.stats_base,
      bases,
      masters.escaladoRules
    );

    if (JSON.stringify(newDerivados) !== JSON.stringify(character.atributos_derivados)) {
      setCharacter(prev => prev ? { ...prev, atributos_derivados: newDerivados } : null);
    }
  }, [character?.stats_base, character?.rango, masters.escaladoRules, masters.rangoRules]);

  // Auto Rank Effect
  useEffect(() => {
    if (!character || !masters.rangoRules) return;
    
    const newRango = StatsLogic.calculateAutoRank(character.puntos_stats, masters.rangoRules);
    if (newRango !== character.rango) {
      setCharacter(prev => prev ? { ...prev, rango: newRango } : null);
    }
  }, [character?.puntos_stats, masters.rangoRules]);

  const updateField = (field: keyof Character, value: any) => {
    setCharacter(prev => prev ? { ...prev, [field]: value } : null);
  };

  const updateStat = (statName: keyof CharacterStats, value: number) => {
    if (!character || !masters.rangoRules) return;
    
    const validation = StatsLogic.validateStatChange(
      statName,
      value,
      character.stats_base,
      character.rango,
      character.puntos_stats,
      masters.rangoRules
    );

    if (validation.valid) {
      setCharacter(prev => prev ? {
        ...prev,
        stats_base: { ...prev.stats_base, [statName]: value }
      } : null);
    } else if (validation.message) {
      addToast(validation.message, 'error');
    }
  };

  const save = async (section?: 'apariencia' | 'historia') => {
    if (!character) return;
    setSaving(true);
    try {
      if (section) {
        const content = section === 'apariencia' ? character.apariencia : character.historia;
        const res = await fetch(`/api/characters/${characterId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section, data: { [section]: content } })
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Fallo en sincronización con Discord');
        }
        addToast(`${section === 'apariencia' ? 'Apariencia' : 'Historia'} sincronizada con Discord`, 'success');
      } else {
        await CharacterService.updateCharacter(characterId, character);
        await Promise.all([
          CharacterService.updateCharacterRamas(characterId, character.personajes_ramas || []),
          CharacterService.updateCharacterInventory(characterId, character.personajes_inventario || []),
          CharacterService.updateCharacterTecnicas(characterId, character.personajes_tecnicas || [])
        ]);
        setOriginalCharacter(JSON.parse(JSON.stringify(character)));
        setIsEditing(false);
        addToast("Ficha guardada con éxito", "success");
      }
    } catch (err: any) {
      addToast(err.message || "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setCharacter(JSON.parse(JSON.stringify(originalCharacter)));
    setIsEditing(false);
    addToast("Cambios descartados", "info");
  };

  const remove = async () => {
    if (!character || !isAdmin) return;
    if (!confirm('¿ESTÁS SEGURO? Esta acción es irreversible y borrará TODO el historial del personaje.')) return;

    setSaving(true);
    try {
      const villageId = character.aldea_id;
      await CharacterService.deleteCharacter(characterId);
      addToast("Personaje eliminado permanentemente", "success");
      window.location.href = villageId ? `/mundo-ninja/${villageId}` : '/';
    } catch (err: any) {
      addToast(err.message || "Error al eliminar", "error");
    } finally {
      setSaving(false);
    }
  };

  return {
    character,
    loading,
    saving,
    canEdit,
    isAdmin,
    isEditing,
    setIsEditing,
    activeTab,
    setActiveTab,
    masters,
    updateField,
    updateStat,
    save,
    cancel,
    remove
  };
}
