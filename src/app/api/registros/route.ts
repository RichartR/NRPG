import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { RewardLogic } from '@/domain/character/logic';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { action, payload, id } = await request.json();

    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin' || user.user_metadata?.role === 'admin' || user.app_metadata?.role === 'admin';

    if (!isAdmin) {
      return NextResponse.json({ error: 'No tienes permisos de administrador' }, { status: 403 });
    }

    const adminClient = createAdminClient();

    if (action === 'create') {
      // 1. Crear el registro base
      const { data: registro, error: regError } = await adminClient
        .from('reg_registros')
        .insert({
          tipo: payload.tipo,
          subtipo: payload.subtipo,
          data: payload.data,
          autor_id: payload.autor_id
        })
        .select()
        .single();

      if (regError) throw regError;

      // 2. Crear participantes (Todos empiezan como 'pendiente' para esperar su aceptación manual, excepto el autor)
      if (payload.participantes_ids.length > 0) {
        const participantsData = payload.participantes_ids.map((pid: number) => ({
          registro_id: registro.id,
          personaje_id: pid,
          estado: payload.autor_id && pid === payload.autor_id ? 'aceptado' : 'pendiente'
        }));

        const { error: partError } = await adminClient
          .from('reg_registros_participantes')
          .insert(participantsData);
        
        if (partError) throw partError;
      }

      // 3. Aplicar recompensas instantáneas al autor (si tiene personaje)
      if (payload.autor_id) {
        const { xp, ryous } = RewardLogic.calculateReward(registro, payload.autor_id);
        const combatPts = RewardLogic.calculateCombatPoints(registro, payload.autor_id);
        
        if (xp > 0 || ryous > 0 || combatPts > 0) {
          const { data: char } = await adminClient
            .from('reg_characters')
            .select('xp, ryous, puntos_combate')
            .eq('id', payload.autor_id)
            .single();

          if (char) {
            await adminClient
              .from('reg_characters')
              .update({
                xp: (char.xp || 0) + xp,
                ryous: (char.ryous || 0) + ryous,
                puntos_combate: (char.puntos_combate || 0) + combatPts
              })
              .eq('id', payload.autor_id);
          }
        }
      }

      return NextResponse.json(registro);
    }

    if (action === 'update') {
      // 1. Obtener el registro viejo y sus participantes actuales
      const { data: oldRegistro } = await adminClient.from('reg_registros').select('*').eq('id', id).single();
      const { data: currentDbParticipants } = await adminClient.from('reg_registros_participantes').select('*').eq('registro_id', id);
      
      if (!oldRegistro) throw new Error('Registro no encontrado');
      
      const updatedData = {
        ...payload.data,
        fecha_modificacion: new Date().toISOString()
      };
      
      // 2. Actualizar el registro base
      const { error: updateError } = await adminClient
        .from('reg_registros')
        .update({
          subtipo: payload.subtipo,
          data: updatedData
        })
        .eq('id', id);
      
      if (updateError) throw updateError;

      if (!payload.participantes_ids) return NextResponse.json({ success: true });

      const newParticipantIds = payload.participantes_ids;
      const oldParticipants = currentDbParticipants || [];
      const oldParticipantIds = oldParticipants.map(p => p.personaje_id);

      // A. ELIMINADOS: En la DB vieja pero NO en la nueva lista (se les retiran los premios si ya habían aceptado)
      const removedParticipants = oldParticipants.filter(p => !newParticipantIds.includes(p.personaje_id));
      for (const p of removedParticipants) {
        if (p.estado === 'aceptado') {
          const { xp, ryous } = RewardLogic.calculateReward(oldRegistro, p.personaje_id);
          const combatPts = RewardLogic.calculateCombatPoints(oldRegistro, p.personaje_id);
          
          let extraMonedaEvento = 0;
          let glosarioItems: any[] = [];
          if (oldRegistro.subtipo === 'evento_premios') {
            const oldPartPremio = oldRegistro.data.participantes_premios?.find((pItem: any) => Number(pItem.personaje_id) === Number(p.personaje_id));
            const oldGlobalMonedas = Number(oldRegistro.data.global_monedas_evento) || 0;
            extraMonedaEvento = oldGlobalMonedas + (Number(oldPartPremio?.monedas_evento) || 0);
            glosarioItems = oldPartPremio?.glosario_items || [];
          }

          const { data: char } = await adminClient.from('reg_characters').select('xp, ryous, puntos_combate, moneda_evento').eq('id', p.personaje_id).single();
          if (char) {
            await adminClient.from('reg_characters').update({
              xp: Math.max(0, (char.xp || 0) - xp),
              ryous: Math.max(0, (char.ryous || 0) - ryous),
              puntos_combate: Math.max(0, (char.puntos_combate || 0) - combatPts),
              moneda_evento: Math.max(0, (char.moneda_evento || 0) - extraMonedaEvento)
            }).eq('id', p.personaje_id);
          }

          if (glosarioItems.length > 0) {
            const itemIds = glosarioItems.filter((i: any) => Number(i.categoria_id) === 2).map((i: any) => i.id);
            const techIds = glosarioItems.filter((i: any) => Number(i.categoria_id) !== 2).map((i: any) => i.id);

            if (itemIds.length > 0) {
              await adminClient.from('reg_personajes_inventario').delete().eq('personaje_id', p.personaje_id).in('item_id', itemIds);
            }
            if (techIds.length > 0) {
              await adminClient.from('reg_personajes_tecnicas').delete().eq('personaje_id', p.personaje_id).in('tecnica_id', techIds);
            }
          }
        }
        await adminClient.from('reg_registros_participantes').delete().eq('id', p.id);
      }

      // B. AÑADIDOS: En la nueva lista pero NO en la DB vieja (se añaden como 'pendiente' para esperar su aceptación manual)
      const addedParticipantIds = newParticipantIds.filter((pid: number) => !oldParticipantIds.includes(pid));
      const autorId = payload.autor_id || oldRegistro.autor_id;
      for (const pid of addedParticipantIds) {
        const isAutor = autorId ? pid === autorId : false;
        const estado = isAutor ? 'aceptado' : 'pendiente';

        const { data: newPart } = await adminClient
          .from('reg_registros_participantes')
          .insert({
            registro_id: id,
            personaje_id: pid,
            estado
          })
          .select()
          .single();

        if (isAutor && newPart) {
          const newRegistroFull = { ...oldRegistro, subtipo: payload.subtipo, data: payload.data };
          const { xp, ryous } = RewardLogic.calculateReward(newRegistroFull, pid);
          const combatPts = RewardLogic.calculateCombatPoints(newRegistroFull, pid);

          const { data: char } = await adminClient.from('reg_characters').select('xp, ryous, puntos_combate').eq('id', pid).single();
          if (char) {
            await adminClient.from('reg_characters').update({
              xp: (char.xp || 0) + xp,
              ryous: (char.ryous || 0) + ryous,
              puntos_combate: (char.puntos_combate || 0) + combatPts
            }).eq('id', pid);
          }
        }
      }

      // C. EXISTENTES: En ambas listas. Si ya aceptaron, ajustamos diferencias
      const existingParticipants = oldParticipants.filter(p => newParticipantIds.includes(p.personaje_id));
      const newRegistroFull = { ...oldRegistro, subtipo: payload.subtipo, data: payload.data };
      for (const p of existingParticipants) {
        if (p.estado === 'aceptado') {
          const oldRewards = RewardLogic.calculateReward(oldRegistro, p.personaje_id);
          const newRewards = RewardLogic.calculateReward(newRegistroFull, p.personaje_id);
          const oldCombatPts = RewardLogic.calculateCombatPoints(oldRegistro, p.personaje_id);
          const newCombatPts = RewardLogic.calculateCombatPoints(newRegistroFull, p.personaje_id);

          const diffXp = newRewards.xp - oldRewards.xp;
          const diffRyous = newRewards.ryous - oldRewards.ryous;
          const diffCombatPts = newCombatPts - oldCombatPts;

          let oldExtraME = 0;
          let oldGlosario: any[] = [];
          let newExtraME = 0;
          let newGlosario: any[] = [];

          if (oldRegistro.subtipo === 'evento_premios') {
            const oldPartPremio = oldRegistro.data.participantes_premios?.find((pItem: any) => Number(pItem.personaje_id) === Number(p.personaje_id));
            const oldGlobalMonedas = Number(oldRegistro.data.global_monedas_evento) || 0;
            oldExtraME = oldGlobalMonedas + (Number(oldPartPremio?.monedas_evento) || 0);
            oldGlosario = oldPartPremio?.glosario_items || [];
          }
          if (newRegistroFull.subtipo === 'evento_premios') {
            const newPartPremio = newRegistroFull.data.participantes_premios?.find((pItem: any) => Number(pItem.personaje_id) === Number(p.personaje_id));
            const newGlobalMonedas = Number(newRegistroFull.data.global_monedas_evento) || 0;
            newExtraME = newGlobalMonedas + (Number(newPartPremio?.monedas_evento) || 0);
            newGlosario = newPartPremio?.glosario_items || [];
          }

          const diffME = newExtraME - oldExtraME;

          if (diffXp !== 0 || diffRyous !== 0 || diffCombatPts !== 0 || diffME !== 0) {
            const { data: char } = await adminClient.from('reg_characters').select('xp, ryous, puntos_combate, moneda_evento').eq('id', p.personaje_id).single();
            if (char) {
              await adminClient.from('reg_characters').update({
                xp: Math.max(0, (char.xp || 0) + diffXp),
                ryous: Math.max(0, (char.ryous || 0) + diffRyous),
                puntos_combate: Math.max(0, (char.puntos_combate || 0) + diffCombatPts),
                moneda_evento: Math.max(0, (char.moneda_evento || 0) + diffME)
              }).eq('id', p.personaje_id);
            }
          }

          if (oldRegistro.subtipo === 'evento_premios' || newRegistroFull.subtipo === 'evento_premios') {
            const oldItemIds = oldGlosario.filter((i: any) => Number(i.categoria_id) === 2).map((i: any) => i.id);
            const oldTechIds = oldGlosario.filter((i: any) => Number(i.categoria_id) !== 2).map((i: any) => i.id);

            if (oldItemIds.length > 0) {
              await adminClient.from('reg_personajes_inventario').delete().eq('personaje_id', p.personaje_id).in('item_id', oldItemIds);
            }
            if (oldTechIds.length > 0) {
              await adminClient.from('reg_personajes_tecnicas').delete().eq('personaje_id', p.personaje_id).in('tecnica_id', oldTechIds);
            }

            const inventoryPack = newGlosario
              .filter((i: any) => Number(i.categoria_id) === 2)
              .map((i: any) => ({ personaje_id: p.personaje_id, item_id: i.id }));

            const techniquesPack = newGlosario
              .filter((i: any) => Number(i.categoria_id) !== 2)
              .map((i: any) => ({ personaje_id: p.personaje_id, tecnica_id: i.id }));

            if (inventoryPack.length > 0) {
              await adminClient.from('reg_personajes_inventario').insert(inventoryPack);
            }
            if (techniquesPack.length > 0) {
              await adminClient.from('reg_personajes_tecnicas').insert(techniquesPack);
            }
          }
        }
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'delete') {
      // 1. Obtener participantes y registro para revertir recompensas
      const { data: registro } = await adminClient.from('reg_registros').select('*').eq('id', id).single();
      const { data: participantes } = await adminClient.from('reg_registros_participantes').select('*').eq('registro_id', id);
      
      if (registro) {
        if (participantes) {
          for (const p of participantes) {
            if (p.estado === 'aceptado') {
              const { xp, ryous } = RewardLogic.calculateReward(registro, p.personaje_id);
              const combatPts = RewardLogic.calculateCombatPoints(registro, p.personaje_id);
              
              let extraMonedaEvento = 0;
              let glosarioItems: any[] = [];
              if (registro.subtipo === 'evento_premios') {
                const partPremio = registro.data.participantes_premios?.find((pItem: any) => Number(pItem.personaje_id) === Number(p.personaje_id));
                const globalMonedas = Number(registro.data.global_monedas_evento) || 0;
                extraMonedaEvento = globalMonedas + (Number(partPremio?.monedas_evento) || 0);
                glosarioItems = partPremio?.glosario_items || [];
              }

              const { data: char } = await adminClient.from('reg_characters').select('xp, ryous, puntos_combate, moneda_evento').eq('id', p.personaje_id).single();
              if (char) {
                await adminClient.from('reg_characters').update({
                  xp: Math.max(0, (char.xp || 0) - xp),
                  ryous: Math.max(0, (char.ryous || 0) - ryous),
                  puntos_combate: Math.max(0, (char.puntos_combate || 0) - combatPts),
                  moneda_evento: Math.max(0, (char.moneda_evento || 0) - extraMonedaEvento)
                }).eq('id', p.personaje_id);
              }

              if (glosarioItems.length > 0) {
                const itemIds = glosarioItems.filter((i: any) => Number(i.categoria_id) === 2).map((i: any) => i.id);
                const techIds = glosarioItems.filter((i: any) => Number(i.categoria_id) !== 2).map((i: any) => i.id);

                if (itemIds.length > 0) {
                  await adminClient.from('reg_personajes_inventario').delete().eq('personaje_id', p.personaje_id).in('item_id', itemIds);
                }
                if (techIds.length > 0) {
                  await adminClient.from('reg_personajes_tecnicas').delete().eq('personaje_id', p.personaje_id).in('tecnica_id', techIds);
                }
              }
            }
          }
        }

        if (registro.tipo === 'accion') {
          const spentXp = Number(registro.data?.gasto_xp) || 0;
          const spentRyous = Number(registro.data?.gasto_ryous) || 0;
          const spentPC = Number(registro.data?.gasto_pc) || 0;

          if (spentXp > 0 || spentRyous > 0 || spentPC > 0) {
            const { data: char } = await adminClient.from('reg_characters').select('xp, ryous, puntos_combate').eq('id', registro.autor_id).single();
            if (char) {
              await adminClient.from('reg_characters').update({
                xp: (char.xp || 0) + spentXp,
                ryous: (char.ryous || 0) + spentRyous,
                puntos_combate: (char.puntos_combate || 0) + spentPC
              }).eq('id', registro.autor_id);
            }
          }
        }
      }

      await adminClient.from('reg_registros_participantes').delete().eq('registro_id', id);
      const { error } = await adminClient
        .from('reg_registros')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error: any) {
    console.error('API Registros Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
