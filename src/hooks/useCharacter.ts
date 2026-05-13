import { useState, useEffect } from 'react';
import { CharacterService } from '@/services/supabase/character.service';
import { StatsLogic } from '@/domain/character/logic';
import { Character, CharacterStats } from '@/domain/types';
import { createClient } from '@/utils/supabase/client';
import { useMasterStore } from '@/store/useMasterStore';
import { useToastStore } from '@/components/ui/Toast';

export function useCharacter(characterId: string) {
  const [character, setCharacter] = useState<Character | null>(null);
  const [originalCharacter, setOriginalCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Master data from Store
  const masters = useMasterStore();
  const addToast = useToastStore(state => state.addToast);

  const loadData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      
      // Ensure master data is loaded
      if (!masters.initialized) {
        await masters.initialize();
      }
      
      const [char, { data: { user } }] = await Promise.all([
        CharacterService.getCharacterById(characterId),
        supabase.auth.getUser()
      ]);

      // Permission check
      let isAdmin = false;
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        isAdmin = profile?.role === 'admin';
      }
      setCanEdit(!!(isAdmin || (user && char.user_id === user.id)));

      // Discord data fetch
      let aparienciaTexto = '';
      let historiaTexto = '';
      if (char.apariencia_msg_id) {
        try {
          const res = await fetch(`/api/discord/messages?messageId=${char.apariencia_msg_id}`);
          const dMsg = await res.json();
          if (dMsg.content) aparienciaTexto = dMsg.content.split('\n').slice(1).join('\n');
        } catch (e) {}
      }
      if (char.historia_msg_id) {
        try {
          const res = await fetch(`/api/discord/messages?messageId=${char.historia_msg_id}`);
          const dMsg = await res.json();
          if (dMsg.content) historiaTexto = dMsg.content.split('\n').slice(1).join('\n');
        } catch (e) {}
      }

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
        const msgId = section === 'apariencia' ? character.apariencia_msg_id : character.historia_msg_id;
        const content = section === 'apariencia' ? character.apariencia : character.historia;
        const res = await fetch('/api/discord/messages', {
          method: 'PATCH',
          body: JSON.stringify({ 
            messageId: msgId, 
            content: `**${section.toUpperCase()} DE ${character.nombre_ninja.toUpperCase()}**\n${content}` 
          })
        });
        if (!res.ok) throw new Error("Fallo en sincronización con Discord");
        addToast(`${section === 'apariencia' ? 'Apariencia' : 'Historia'} actualizada`, 'success');
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

  return {
    character,
    loading,
    saving,
    canEdit,
    isEditing,
    setIsEditing,
    activeTab,
    setActiveTab,
    masters,
    updateField,
    updateStat,
    save,
    cancel
  };
}
