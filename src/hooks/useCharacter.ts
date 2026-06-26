import { useState, useEffect } from 'react';
import { CharacterService } from '@/services/supabase/character.service';
import { RegistrosService } from '@/services/supabase/registros.service';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';
import { StatsLogic, NinjutsuLogic } from '@/domain/character/logic';
import { Character, CharacterStats } from '@/domain/types';
import { useMasterStore } from '@/store/useMasterStore';
import { AuthService } from '@/services/supabase/auth.service';
import { ProfileService } from '@/services/supabase/profile.service';
import { useToastStore } from '@/components/ui/Toast';
import { MasterService } from '@/services/supabase/master.service';

export function useCharacter(characterId: string) {
  const { confirm: confirmAction } = useConfirmStore();
  const [character, setCharacter] = useState<Character | null>(null);
  const [glosarioFiltrado, setGlosarioFiltrado] = useState<any[]>([]);
  const [originalCharacter, setOriginalCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [freeResetPeriod, setFreeResetPeriod] = useState<boolean>(false);
  const [glosarioCompleto, setGlosarioCompleto] = useState<any[]>([]);

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
      
      // 1. Carga inicial en paralelo (User, Character, Master Store, Glosario Completo, Config)
      const [userRes, char, allGlosario, isFree] = await Promise.all([
        AuthService.getUser(),
        CharacterService.getCharacterById(Number(characterId)),
        MasterService.getGlosarios(),
        MasterService.getSystemConfig('periodo_reseteos_gratuitos'),
        masters.initialized ? Promise.resolve() : masters.initialize()
      ]);

      const user = userRes.data.user;
      setFreeResetPeriod(isFree === true || String(isFree) === 'true');

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

      const isAdm = profile?.roles?.includes('admin') || false;
      setIsAdmin(isAdm);
      setCanEdit(!!(isAdm || (user && char.user_id === user.id)));

      const aparienciaTexto = aparienciaMsg?.content ? aparienciaMsg.content.split('\n').slice(1).join('\n') : '';
      const historiaTexto = historiaMsg?.content ? historiaMsg.content.split('\n').slice(1).join('\n') : '';

      const fullChar = { ...char, apariencia: aparienciaTexto, historia: historiaTexto };
      setCharacter(fullChar);
      setOriginalCharacter(JSON.parse(JSON.stringify(fullChar)));
      setGlosarioCompleto(allGlosario);
    } catch (err: any) {
      addToast(`Error al cargar: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [characterId]);

  // CARGA DE GLOSARIO BAJO DEMANDA (Solo al editar)
  useEffect(() => {
    const loadGlosario = async () => {
      if (isEditing && glosarioFiltrado.length === 0) {
        try {
          const items = await CharacterService.getValidItems(Number(characterId));
          setGlosarioFiltrado(items);
        } catch (err) {
          console.error("Error loading glosario on edit:", err);
        }
      }
    };
    loadGlosario();
  }, [isEditing, characterId]);

  // Derived Stats Effect
  const statsBaseSignature = JSON.stringify(character?.stats_base || {});
  const escaladoRulesSignature = JSON.stringify(masters.escaladoRules || {});
  const rangoRulesSignature = JSON.stringify(masters.rangoRules || {});

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
  }, [statsBaseSignature, character?.rango, escaladoRulesSignature, rangoRulesSignature]);

  // Auto Rank Effect
  const tecsSignature = JSON.stringify(character?.personajes_tecnicas?.map(t => t.tecnica_id) || []);
  const ramasSignature = JSON.stringify(character?.personajes_ramas?.map(r => [r.rama_id, r.sub_especialidad_id, r.elemento_principal_id, r.elemento_secundario_id, r.elemento_terciario_id]) || []);
  const subEspecialidadesSignature = JSON.stringify(masters.subEspecialidades || []);
  const glosarioLength = glosarioCompleto?.length || 0;

  useEffect(() => {
    if (!character || !masters.rangoRules) return;
    
    const newRango = StatsLogic.calculateAutoRank(
      character.puntos_stats,
      masters.rangoRules,
      character.personajes_tecnicas || [],
      character.personajes_ramas || [],
      glosarioCompleto,
      masters.subEspecialidades || [],
      character.eleccion_tecnicas_clan,
      masters.elementos || []
    );
    if (newRango !== character.rango) {
      setCharacter(prev => prev ? { ...prev, rango: newRango } : null);
    }
  }, [character?.puntos_stats, rangoRulesSignature, tecsSignature, ramasSignature, glosarioLength, subEspecialidadesSignature, character?.eleccion_tecnicas_clan, masters.elementos]);

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
      if (!section) {
        // VALIDAR LÍMITES DE TÉCNICAS BÁSICAS DE NINJUTSU II Y III ANTES DE GUARDAR
        const validation = NinjutsuLogic.validateNinjutsuLimits(
          character.personajes_ramas || [],
          character.personajes_tecnicas || [],
          masters.subEspecialidades || [],
          character.eleccion_tecnicas_clan
        );
        if (!validation.valid) {
          throw new Error(validation.error);
        }
      }

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
        // Check new trainings and deduct costs
        const oldEntrenamientos = originalCharacter?.personajes_entrenamientos || [];
        const newEntrenamientos = character.personajes_entrenamientos || [];
        
        let totalExpCost = 0;
        let totalRyousCost = 0;
        let totalPACost = 0;
        const newTrainingsList: any[] = [];
        
        newEntrenamientos.forEach(newE => {
          const wasEquipped = oldEntrenamientos.some(oe => Number(oe.entrenamiento_id) === Number(newE.entrenamiento_id));
          if (!wasEquipped) {
            const tr = (masters.entrenamientos || []).find(x => x.id === Number(newE.entrenamiento_id));
            if (tr) {
              totalExpCost += tr.coste_exp || 0;
              totalRyousCost += tr.coste_ryous || 0;
              totalPACost += tr.coste_puntos_aprendizaje || 0;
              newTrainingsList.push(tr);
            }
          }
        });

        if (newTrainingsList.length > 0) {

          const trNames = newTrainingsList.map(t => t.nombre_jp || t.nombre_esp).join(', ');
          const gastoText = [
            totalExpCost > 0 && `${totalExpCost} EXP`,
            totalRyousCost > 0 && `${totalRyousCost} Ryous`,
            totalPACost > 0 && `${totalPACost} PA`
          ].filter(Boolean).join(', ') || '0 EXP';

          await RegistrosService.createRegistro({
            tipo: 'accion',
            autor_id: Number(characterId),
            participantes_ids: [Number(characterId)],
            data: {
              titulo: `${character.nombre_ninja} obtiene el entrenamiento: ${trNames}`,
              subtitulo: `Gasto: ${gastoText}`,
              tipo_accion: 'compra_entrenamientos',
              entrenamientos: newTrainingsList.map(t => ({ id: t.id, nombre: t.nombre_jp || t.nombre_esp })),
              gasto_xp: totalExpCost,
              gasto_ryous: totalRyousCost,
              gasto_pc: totalPACost
            }
          });
        }

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

        // Check Ninja Name change
        if (originalCharacter && character.nombre_ninja !== originalCharacter.nombre_ninja) {
          await RegistrosService.createRegistro({
            tipo: 'accion',
            autor_id: Number(characterId),
            participantes_ids: [Number(characterId)],
            data: {
              titulo: `${originalCharacter.nombre_ninja} pasa a llamarse ${character.nombre_ninja}`,
              tipo_accion: 'cambio_nombre_ninja',
              anterior: originalCharacter.nombre_ninja,
              nuevo: character.nombre_ninja
            }
          });
        }

        // Check Hobba Name change
        if (originalCharacter && character.hobba_name !== originalCharacter.hobba_name) {
          await RegistrosService.createRegistro({
            tipo: 'accion',
            autor_id: Number(characterId),
            participantes_ids: [Number(characterId)],
            data: {
              titulo: `${character.nombre_ninja} cambió su nombre en Hobba: ${originalCharacter.hobba_name} -> ${character.hobba_name}`,
              tipo_accion: 'cambio_nombre_hobba',
              anterior: originalCharacter.hobba_name,
              nuevo: character.hobba_name
            }
          });
        }

        // Check Hierarchical Rank change
        if (originalCharacter && character.rango_jerarquico !== originalCharacter.rango_jerarquico) {
          await RegistrosService.createRegistro({
            tipo: 'accion',
            autor_id: Number(characterId),
            participantes_ids: [Number(characterId)],
            data: {
              titulo: `${character.nombre_ninja} asciende a ${character.rango_jerarquico}`,
              tipo_accion: 'ascenso_jerarquico',
              rango_nuevo: character.rango_jerarquico
            }
          });
        }

        // Check technical rank change (D, C, B, A, S)
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
        
        
        // Check new items
        const currentInv = character.personajes_inventario || [];
        const oldInv = originalCharacter?.personajes_inventario || [];
        const newItems = currentInv.filter(ci => !oldInv.some(oi => Number(oi.item_id) === Number(ci.item_id)));

        if (newItems.length > 0) {
          const itemNames = newItems.map(ni => ni.info_glosario?.nombre_jp || ni.info_glosario?.nombre_es || 'Objeto Desconocido').join(', ');
          const totalExp = newItems.reduce((sum, ni) => sum + (Number(ni.info_glosario?.coste_exp) || 0), 0);
          const totalRyous = newItems.reduce((sum, ni) => sum + (Number(ni.info_glosario?.coste_ryous) || 0), 0);
          const totalPA = newItems.reduce((sum, ni) => sum + (Number(ni.info_glosario?.coste_puntos_aprendizaje) || 0), 0);
          
          const gastoText = [
            totalExp > 0 && `${totalExp} EXP`,
            totalRyous > 0 && `${totalRyous} Ryous`,
            totalPA > 0 && `${totalPA} PA`
          ].filter(Boolean).join(', ') || '0 EXP';
          
          await RegistrosService.createRegistro({
            tipo: 'accion',
            autor_id: Number(characterId),
            participantes_ids: [Number(characterId)],
            data: {
              titulo: `${character.nombre_ninja} obtiene: ${itemNames}`,
              subtitulo: `Gasto: ${gastoText}`,
              tipo_accion: 'compra_objetos',
              items: newItems.map(ni => ({ id: ni.item_id, nombre: ni.info_glosario?.nombre_jp || ni.info_glosario?.nombre_es })),
              gasto_xp: totalExp,
              gasto_ryous: totalRyous,
              gasto_pc: totalPA
            }
          });
        }

        // Check new techniques
        const currentTecs = character.personajes_tecnicas || [];
        const oldTecs = originalCharacter?.personajes_tecnicas || [];
        const newTecs = currentTecs.filter(ct => !oldTecs.some(ot => Number(ot.tecnica_id) === Number(ct.tecnica_id)));

        if (newTecs.length > 0) {
          const tecNames = newTecs.map(nt => nt.info_glosario?.nombre_jp || nt.info_glosario?.nombre_es || 'Técnica Desconocida').join(', ');
          const totalExp = newTecs.reduce((sum, nt) => sum + (Number(nt.info_glosario?.coste_exp) || 0), 0);
          const totalRyous = newTecs.reduce((sum, nt) => sum + (Number(nt.info_glosario?.coste_ryous) || 0), 0);
          const totalPA = newTecs.reduce((sum, nt) => sum + (Number(nt.info_glosario?.coste_puntos_aprendizaje) || 0), 0);

          const gastoText = [
            totalExp > 0 && `${totalExp} EXP`,
            totalRyous > 0 && `${totalRyous} Ryous`,
            totalPA > 0 && `${totalPA} PA`
          ].filter(Boolean).join(', ') || '0 EXP';

          await RegistrosService.createRegistro({
            tipo: 'accion',
            autor_id: Number(characterId),
            participantes_ids: [Number(characterId)],
            data: {
              titulo: `${character.nombre_ninja} aprende: ${tecNames}`,
              subtitulo: `Gasto: ${gastoText}`,
              tipo_accion: 'aprendizaje_tecnicas',
              tecnicas: newTecs.map(nt => ({ id: nt.tecnica_id, nombre: nt.info_glosario?.nombre_jp || nt.info_glosario?.nombre_es })),
              gasto_xp: totalExp,
              gasto_ryous: totalRyous,
              gasto_pc: totalPA
            }
          });
        }

        // Check deleted items
        const deletedItems = oldInv.filter(oi => !currentInv.some(ci => Number(ci.item_id) === Number(oi.item_id)));
        if (deletedItems.length > 0) {
          const itemNames = deletedItems.map(di => di.info_glosario?.nombre_jp || di.info_glosario?.nombre_es || 'Objeto').join(', ');
          await RegistrosService.createRegistro({
            tipo: 'accion',
            autor_id: Number(characterId),
            participantes_ids: [Number(characterId)],
            data: {
              titulo: `${character.nombre_ninja} pierde/elimina: ${itemNames}`,
              tipo_accion: 'eliminacion_objetos',
              items: deletedItems.map(di => ({ id: di.item_id, nombre: di.info_glosario?.nombre_jp || di.info_glosario?.nombre_es }))
            }
          });
        }

        // Check deleted techniques
        const deletedTecs = oldTecs.filter(ot => !currentTecs.some(ct => Number(ct.tecnica_id) === Number(ot.tecnica_id)));
        if (deletedTecs.length > 0) {
          const tecNames = deletedTecs.map(dt => dt.info_glosario?.nombre_jp || dt.info_glosario?.nombre_es || 'Técnica').join(', ');
          await RegistrosService.createRegistro({
            tipo: 'accion',
            autor_id: Number(characterId),
            participantes_ids: [Number(characterId)],
            data: {
              titulo: `${character.nombre_ninja} olvida/elimina: ${tecNames}`,
              tipo_accion: 'eliminacion_tecnicas',
              tecnicas: deletedTecs.map(dt => ({ id: dt.tecnica_id, nombre: dt.info_glosario?.nombre_jp || dt.info_glosario?.nombre_es }))
            }
          });
        }

        // Check new traits (rasgos)
        const currentRasgos = character.personajes_rasgos || [];
        const oldRasgos = originalCharacter?.personajes_rasgos || [];
        
        const newRasgosList = currentRasgos.filter(cr => !oldRasgos.some(or => Number(or.rasgo_id) === Number(cr.rasgo_id)));
        const deletedRasgosList = oldRasgos.filter(or => !currentRasgos.some(cr => Number(cr.rasgo_id) === Number(or.rasgo_id)));

        if (newRasgosList.length > 0) {
          const rasgoNames = newRasgosList.map(nr => nr.info_rasgos?.nombre || 'Rasgo').join(', ');
          await RegistrosService.createRegistro({
            tipo: 'accion',
            autor_id: Number(characterId),
            participantes_ids: [Number(characterId)],
            data: {
              titulo: `${character.nombre_ninja} obtiene el rasgo: ${rasgoNames}`,
              tipo_accion: 'obtencion_rasgos',
              rasgos: newRasgosList.map(nr => ({ id: nr.rasgo_id, nombre: nr.info_rasgos?.nombre }))
            }
          });
        }

        if (deletedRasgosList.length > 0) {
          const rasgoNames = deletedRasgosList.map(dr => dr.info_rasgos?.nombre || 'Rasgo').join(', ');
          await RegistrosService.createRegistro({
            tipo: 'accion',
            autor_id: Number(characterId),
            participantes_ids: [Number(characterId)],
            data: {
              titulo: `${character.nombre_ninja} pierde/elimina el rasgo: ${rasgoNames}`,
              tipo_accion: 'eliminacion_rasgos',
              rasgos: deletedRasgosList.map(dr => ({ id: dr.rasgo_id, nombre: dr.info_rasgos?.nombre }))
            }
          });
        }

        // Check Profile Image change
        const currentProfile = Array.isArray(character.profiles) ? character.profiles[0] : character.profiles;
        const originalProfile = Array.isArray(originalCharacter?.profiles) ? originalCharacter?.profiles[0] : originalCharacter?.profiles;
        
        if (currentProfile && currentProfile.url_img !== originalProfile?.url_img && character.user_id) {
          try {
            await ProfileService.updateProfile(character.user_id, { url_img: currentProfile.url_img });
          } catch (profileErr) {
            console.error("Error updating profile image:", profileErr);
          }
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

  const remove = async (force = false) => {
    if (!character || !canEdit) return;
    
    const message = force 
      ? '¿ESTÁS SEGURO? Esta acción es irreversible y borrará FÍSICAMENTE todo el historial, inventario y ramas del personaje de forma inmediata.'
      : '¿ESTÁS SEGURO? Tu personaje se archivará y dejará de estar activo, liberando sus cupos y requisitos. Se eliminará definitivamente tras 3 meses si no es restaurado por un administrador.';

    const ok = await confirmAction({
      title: force ? 'Eliminar Definitivamente' : 'Archivar Personaje',
      message,
      variant: 'danger',
      confirmLabel: force ? 'Borrar Físicamente' : 'Archivar Personaje',
      requireValidation: force
    });

    if (!ok) return;

    setSaving(true);
    try {
      const villageId = character.aldea_id;
      const url = force ? `/api/characters/${characterId}?force=true` : `/api/characters/${characterId}`;
      const res = await fetch(url, { method: 'DELETE' });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al procesar la solicitud');
      }

      addToast(force ? "Personaje eliminado definitivamente" : "Personaje archivado con éxito", "success");
      window.location.href = villageId ? `/mundo-ninja/${villageId}` : '/';
    } catch (err: any) {
      addToast(err.message || "Error al procesar", "error");
    } finally {
      setSaving(false);
    }
  };

  const restore = async () => {
    if (!character || !isAdmin) return;
    
    setSaving(true);
    try {
      const res = await fetch(`/api/characters/${characterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'restore' })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al restaurar el personaje');
      }

      addToast("Shinobi restaurado con éxito", "success");
      await loadData();
    } catch (err: any) {
      addToast(err.message || "Error al restaurar", "error");
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
          titulo: `${character.nombre_ninja} pierde/elimina: ${item.info_glosario?.nombre_jp || item.info_glosario?.nombre_es}`,
          tipo_accion: 'eliminacion_objetos',
          items: [{ id: item.item_id, nombre: item.info_glosario?.nombre_jp || item.info_glosario?.nombre_es }]
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
          titulo: `${character.nombre_ninja} olvida/elimina: ${tec.info_glosario?.nombre_jp || tec.info_glosario?.nombre_es}`,
          tipo_accion: 'eliminacion_tecnicas',
          tecnicas: [{ id: tec.tecnica_id, nombre: tec.info_glosario?.nombre_jp || tec.info_glosario?.nombre_es }]
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

  const reiniciarPersonaje = async () => {
    if (!character) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/characters/${characterId}/reset`, {
        method: 'POST'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al reiniciar el personaje');
      }
      addToast('¡Personaje reiniciado con éxito!', 'success');
      setIsEditing(false);
      await loadData();
    } catch (err: any) {
      addToast(err.message || 'Error al reiniciar', 'error');
    } finally {
      setSaving(false);
    }
  };

  return {
    character,
    originalCharacter: originalCharacter || character,
    loading,
    saving,
    canEdit,
    isAdmin,
    isEditing,
    setIsEditing,
    activeTab,
    setActiveTab,
    masters,
    glosarioFiltrado: isEditing ? glosarioCompleto : glosarioFiltrado,
    freeResetPeriod,
    updateField,
    updateStat,
    save,
    cancel,
    remove,
    restore,
    refresh: loadData,
    reiniciarPersonaje
  };
}
