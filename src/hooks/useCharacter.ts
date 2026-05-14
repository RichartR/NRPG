import { useState, useEffect } from 'react';
import { CharacterService } from '@/services/supabase/character.service';
import { RegistrosService } from '@/services/supabase/registros.service';
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
      
      const char = await CharacterService.getCharacterById(Number(characterId));

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
        // Check village change
        if (character.aldea_id !== originalCharacter?.aldea_id) {
          const oldAldea = masters.aldeas.find(a => a.id === originalCharacter?.aldea_id)?.nombre_completo || 'Ninguna';
          const newAldea = masters.aldeas.find(a => a.id === character.aldea_id)?.nombre_completo || 'Ninguna';
          
          await RegistrosService.createRegistro({
            tipo: 'accion',
            autor_id: Number(characterId),
            participantes_ids: [Number(characterId)],
            data: {
              titulo: `${character.nombre_ninja} abandona ${oldAldea} y se une a ${newAldea}`,
              tipo_accion: 'cambio_aldea',
              aldea_anterior: oldAldea,
              aldea_nueva: newAldea
            }
          });
        }
        
        // Check new items
        const currentInv = character.personajes_inventario || [];
        const oldInv = originalCharacter?.personajes_inventario || [];
        const newItems = currentInv.filter(ci => !oldInv.some(oi => oi.item_id === ci.item_id));

        if (newItems.length > 0) {
          const itemNames = newItems.map(ni => ni.info_glosario?.nombre_es).join(', ');
          const totalExp = newItems.reduce((sum, ni) => sum + (ni.info_glosario?.coste_exp || 0), 0);
          const totalRyous = newItems.reduce((sum, ni) => sum + (ni.info_glosario?.coste_ryous || 0), 0);
          
          await RegistrosService.createRegistro({
            tipo: 'accion',
            autor_id: Number(characterId),
            participantes_ids: [Number(characterId)],
            data: {
              titulo: `${character.nombre_ninja} obtiene: ${itemNames}`,
              subtitulo: `Gasto: ${totalExp} EXP y ${totalRyous} Ryous`,
              tipo_accion: 'compra_objetos',
              items: newItems.map(ni => ({ id: ni.item_id, nombre: ni.info_glosario?.nombre_es })),
              gasto_xp: totalExp,
              gasto_ryous: totalRyous
            }
          });
        }

        // Check new techniques
        const currentTecs = character.personajes_tecnicas || [];
        const oldTecs = originalCharacter?.personajes_tecnicas || [];
        const newTecs = currentTecs.filter(ct => !oldTecs.some(ot => ot.tecnica_id === ct.tecnica_id));

        if (newTecs.length > 0) {
          const tecNames = newTecs.map(nt => nt.info_glosario?.nombre_es).join(', ');
          const totalExp = newTecs.reduce((sum, nt) => sum + (nt.info_glosario?.coste_exp || 0), 0);
          const totalRyous = newTecs.reduce((sum, nt) => sum + (nt.info_glosario?.coste_ryous || 0), 0);

          await RegistrosService.createRegistro({
            tipo: 'accion',
            autor_id: Number(characterId),
            participantes_ids: [Number(characterId)],
            data: {
              titulo: `${character.nombre_ninja} aprende: ${tecNames}`,
              subtitulo: `Gasto: ${totalExp} EXP y ${totalRyous} Ryous`,
              tipo_accion: 'aprendizaje_tecnicas',
              tecnicas: newTecs.map(nt => ({ id: nt.tecnica_id, nombre: nt.info_glosario?.nombre_es })),
              gasto_xp: totalExp,
              gasto_ryous: totalRyous
            }
          });
        }

        // Check deleted items
        const deletedItems = oldInv.filter(oi => !currentInv.some(ci => ci.item_id === oi.item_id));
        if (deletedItems.length > 0) {
          const itemNames = deletedItems.map(di => di.info_glosario?.nombre_es).join(', ');
          await RegistrosService.createRegistro({
            tipo: 'accion',
            autor_id: Number(characterId),
            participantes_ids: [Number(characterId)],
            data: {
              titulo: `${character.nombre_ninja} pierde/elimina: ${itemNames}`,
              tipo_accion: 'eliminacion_objetos',
              items: deletedItems.map(di => ({ id: di.item_id, nombre: di.info_glosario?.nombre_es }))
            }
          });
        }

        // Check deleted techniques
        const deletedTecs = oldTecs.filter(ot => !currentTecs.some(ct => ct.tecnica_id === ot.tecnica_id));
        if (deletedTecs.length > 0) {
          const tecNames = deletedTecs.map(dt => dt.info_glosario?.nombre_es).join(', ');
          await RegistrosService.createRegistro({
            tipo: 'accion',
            autor_id: Number(characterId),
            participantes_ids: [Number(characterId)],
            data: {
              titulo: `${character.nombre_ninja} olvida/elimina: ${tecNames}`,
              tipo_accion: 'eliminacion_tecnicas',
              tecnicas: deletedTecs.map(dt => ({ id: dt.tecnica_id, nombre: dt.info_glosario?.nombre_es }))
            }
          });
        }

        await CharacterService.updateCharacter(Number(characterId), character);
        await Promise.all([
          CharacterService.updateCharacterRamas(characterId, character.personajes_ramas || []),
          CharacterService.updateCharacterInventory(characterId, character.personajes_inventario || []),
          CharacterService.updateCharacterTecnicas(characterId, character.personajes_tecnicas || [])
        ]);
        addToast("Ficha guardada con éxito", "success");
        setIsEditing(false);
        await loadData();
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
      await CharacterService.deleteCharacter(Number(characterId));
      addToast("Personaje eliminado permanentemente", "success");
      window.location.href = villageId ? `/mundo-ninja/${villageId}` : '/';
    } catch (err: any) {
      addToast(err.message || "Error al eliminar", "error");
    } finally {
      setSaving(false);
    }
  };

  const quickRemoveItem = async (item: any) => {
    if (!character) return;
    if (!confirm(`¿Seguro que quieres eliminar ${item.info_glosario?.nombre_es}?`)) return;
    
    setSaving(true);
    try {
      const newInventory = (character.personajes_inventario || []).filter(i => i.item_id !== item.item_id);
      await CharacterService.updateCharacterInventory(characterId, newInventory);
      
      await RegistrosService.createRegistro({
        tipo: 'accion',
        autor_id: Number(characterId),
        participantes_ids: [Number(characterId)],
        data: {
          titulo: `${character.nombre_ninja} pierde/elimina: ${item.info_glosario?.nombre_es}`,
          tipo_accion: 'eliminacion_objetos',
          items: [{ id: item.item_id, nombre: item.info_glosario?.nombre_es }]
        }
      });
      
      await loadData();
      addToast("Objeto eliminado con éxito", "success");
    } catch (err: any) {
      addToast(err.message || "Error al eliminar", "error");
    } finally {
      setSaving(false);
    }
  };

  const quickRemoveTechnique = async (tec: any) => {
    if (!character) return;
    if (!confirm(`¿Seguro que quieres olvidar ${tec.info_glosario?.nombre_es}?`)) return;
    
    setSaving(true);
    try {
      const newTecs = (character.personajes_tecnicas || []).filter(t => t.tecnica_id !== tec.tecnica_id);
      await CharacterService.updateCharacterTecnicas(characterId, newTecs);
      
      await RegistrosService.createRegistro({
        tipo: 'accion',
        autor_id: Number(characterId),
        participantes_ids: [Number(characterId)],
        data: {
          titulo: `${character.nombre_ninja} olvida/elimina: ${tec.info_glosario?.nombre_es}`,
          tipo_accion: 'eliminacion_tecnicas',
          tecnicas: [{ id: tec.tecnica_id, nombre: tec.info_glosario?.nombre_es }]
        }
      });
      
      await loadData();
      addToast("Técnica olvidada con éxito", "success");
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
    remove,
    refresh: loadData,
    quickRemoveItem,
    quickRemoveTechnique
  };
}
