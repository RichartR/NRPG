import { useState, useEffect } from 'react';
import { CharacterService } from '@/services/supabase/character.service';
import { RegistrosService } from '@/services/supabase/registros.service';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';
import { StatsLogic } from '@/domain/character/logic';
import { Character, CharacterStats } from '@/domain/types';
import { useMasterStore } from '@/store/useMasterStore';
import { AuthService } from '@/services/supabase/auth.service';
import { ProfileService } from '@/services/supabase/profile.service';
import { useToastStore } from '@/components/ui/Toast';

export function useCharacter(characterId: string) {
  const { confirm: confirmAction } = useConfirmStore();
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
      
      // 1. Carga inicial en paralelo (User, Character, Master Store)
      const [userRes, char] = await Promise.all([
        AuthService.getUser(),
        CharacterService.getCharacterById(Number(characterId)),
        masters.initialized ? Promise.resolve() : masters.initialize()
      ]);

      const user = userRes.data.user;

      // 2. Cargas secundarias en paralelo (Profile para Admin, y Discord para contenido)
      const [profile, aparienciaMsg, historiaMsg] = await Promise.all([
        user ? ProfileService.getProfile(user.id) : Promise.resolve(null),
        char.apariencia_msg_id 
          ? fetch(`/api/discord/messages?messageId=${char.apariencia_msg_id}`).then(r => r.json()).catch(() => ({}))
          : Promise.resolve({}),
        char.historia_msg_id 
          ? fetch(`/api/discord/messages?messageId=${char.historia_msg_id}`).then(r => r.json()).catch(() => ({}))
          : Promise.resolve({})
      ]);

      const isAdm = profile?.role === 'admin';
      setIsAdmin(isAdm);
      setCanEdit(!!(isAdm || (user && char.user_id === user.id)));

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

          // Obtener información de ramas y clanes
          const ramasInfo = (character.personajes_ramas || []).map(r => {
            const rama = masters.ramas.find(rm => rm.id === r.rama_id);
            if (!rama) return null;
            const sub = r.sub_especialidad_id ? masters.subEspecialidades.find(s => s.id === r.sub_especialidad_id) : null;
            const articulo = rama.tipo === 'clan' ? 'el' : 'la';
            const subText = sub ? ` (${sub.nombre})` : '';
            return `${articulo} ${rama.tipo} ${rama.nombre}${subText}`;
          }).filter(Boolean);

          let tituloAccion = `${character.nombre_ninja} abandona ${oldAldea} y se une a ${newAldea}`;
          if (ramasInfo.length > 0) {
            tituloAccion += `. Con ${ramasInfo.join(' y ')}.`;
          }

          await RegistrosService.createRegistro({
            tipo: 'accion',
            autor_id: Number(characterId),
            participantes_ids: [Number(characterId)],
            data: {
              titulo: tituloAccion,
              tipo_accion: 'cambio_aldea',
              aldea_anterior: oldAldea,
              aldea_nueva: newAldea
            }
          });
        }

        // Check rank change
        if (character.rango !== originalCharacter?.rango) {
          const oldRank = originalCharacter?.rango || 'D';
          const newRank = character.rango;
          
          const oldIdx = masters.rankOrder[oldRank] || 0;
          const newIdx = masters.rankOrder[newRank] || 0;
          const verb = newIdx > oldIdx ? 'asciende a' : 'desciende a';
          
          await RegistrosService.createRegistro({
            tipo: 'accion',
            autor_id: Number(characterId),
            participantes_ids: [Number(characterId)],
            data: {
              titulo: `${character.nombre_ninja} ${verb} rango ${newRank}`,
              tipo_accion: 'cambio_rango',
              rango_anterior: oldRank,
              rango_nuevo: newRank
            }
          });
        }
        
        // Check branch/clan changes and training choices
        const currentRamas = character.personajes_ramas || [];
        const oldRamas = originalCharacter?.personajes_ramas || [];
        const maxSlots = Math.max(
          currentRamas.length > 0 ? Math.max(...currentRamas.map(r => r.slot)) : 0,
          oldRamas.length > 0 ? Math.max(...oldRamas.map(r => r.slot)) : 0
        );

        for (let slot = 1; slot <= maxSlots; slot++) {
          const current = currentRamas.find(r => r.slot === slot);
          const old = oldRamas.find(r => r.slot === slot);

          // 1. Cambio de Rama/Clan
          if (old?.rama_id && current?.rama_id && old.rama_id !== current.rama_id) {
            const oldRama = masters.ramas.find(r => r.id === old.rama_id);
            const newRama = masters.ramas.find(r => r.id === current.rama_id);
            const oldArt = oldRama?.tipo === 'clan' ? 'el' : 'la';
            const newArt = newRama?.tipo === 'clan' ? 'el' : 'la';
            
            await RegistrosService.createRegistro({
              tipo: 'accion',
              autor_id: Number(characterId),
              participantes_ids: [Number(characterId)],
              data: {
                titulo: `${character.nombre_ninja} abandona ${oldArt} ${oldRama?.tipo || 'rama'} ${oldRama?.nombre || '?'} y se une a ${newArt} ${newRama?.tipo || 'rama'} ${newRama?.nombre || '?'}`,
                tipo_accion: 'cambio_rama',
                rama_anterior: oldRama?.nombre,
                rama_nueva: newRama?.nombre
              }
            });
          }

          // 2. Elección de Entrenamiento
          if (current?.id_entrenamiento !== old?.id_entrenamiento && current?.id_entrenamiento) {
            const training = masters.entrenamientos.find(e => e.id === current.id_entrenamiento);
            const rama = masters.ramas.find(r => r.id === current.rama_id);
            const articulo = rama?.tipo === 'clan' ? 'el' : 'la';
            
            await RegistrosService.createRegistro({
              tipo: 'accion',
              autor_id: Number(characterId),
              participantes_ids: [Number(characterId)],
              data: {
                titulo: `${character.nombre_ninja} ha elegido el ${training?.nombre_esp || '?'} de ${articulo} ${rama?.tipo || 'rama'} ${rama?.nombre || '?'}`,
                tipo_accion: 'eleccion_entrenamiento',
                entrenamiento: training?.nombre_esp,
                rama: rama?.nombre
              }
            });
          }
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

        // 4. Guardar datos principales y relaciones a través de la API (para bypass de RLS)
        const saveRes = await fetch(`/api/characters/${characterId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            section: 'all', 
            data: character 
          })
        });

        if (!saveRes.ok) {
          const err = await saveRes.json();
          throw new Error(err.error || 'Error al guardar los datos del personaje');
        }

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
    if (!character || !canEdit) return;
    
    const ok = await confirmAction({
      title: 'Eliminar Personaje',
      message: '¿ESTÁS SEGURO? Esta acción es irreversible y borrará TODO el historial del personaje.',
      variant: 'danger',
      confirmLabel: 'Eliminar para siempre',
      requireValidation: true
    });

    if (!ok) return;

    setSaving(true);
    try {
      const villageId = character.aldea_id;
      const res = await fetch(`/api/characters/${characterId}`, { method: 'DELETE' });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al eliminar el personaje');
      }

      addToast("Personaje y mensajes de Discord eliminados", "success");
      window.location.href = villageId ? `/mundo-ninja/${villageId}` : '/';
    } catch (err: any) {
      addToast(err.message || "Error al eliminar", "error");
    } finally {
      setSaving(false);
    }
  };

  const quickRemoveItem = async (item: any) => {
    if (!character) return;
    
    const ok = await confirmAction({
      title: 'Eliminar Objeto',
      message: `¿Seguro que quieres eliminar ${item.info_glosario?.nombre_es}?`,
      variant: 'danger'
    });

    if (!ok) return;
    
    setSaving(true);
    try {
      const newInventory = (character.personajes_inventario || []).filter(i => i.item_id !== item.item_id);
      
      const res = await fetch(`/api/characters/${characterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          section: 'inventario', 
          data: { personajes_inventario: newInventory } 
        })
      });

      if (!res.ok) throw new Error('Error al actualizar inventario');

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
    
    const ok = await confirmAction({
      title: 'Olvidar Técnica',
      message: `¿Seguro que quieres olvidar ${tec.info_glosario?.nombre_es}?`,
      variant: 'danger'
    });

    if (!ok) return;
    
    setSaving(true);
    try {
      const newTecs = (character.personajes_tecnicas || []).filter(t => t.tecnica_id !== tec.tecnica_id);
      
      const res = await fetch(`/api/characters/${characterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          section: 'tecnicas', 
          data: { personajes_tecnicas: newTecs } 
        })
      });

      if (!res.ok) throw new Error('Error al actualizar técnicas');

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
