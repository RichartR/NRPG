import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { ProfileService } from '@/services/supabase/profile.service';
import { RewardLogic } from '@/domain/character/logic';
import { CharacterServerService } from '@/services/supabase/character.server.service';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { notificacionId, resolucion } = await request.json();

    if (!notificacionId || !['aceptada', 'rechazada'].includes(resolucion)) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const profile = await ProfileService.getProfile(user.id, adminClient);
    const roles: string[] = profile?.roles || [];

    const isAdmin = roles.includes('admin') || user.user_metadata?.role === 'admin' || user.app_metadata?.role === 'admin';
    const isModerator = roles.includes('moderador');
    const isNarrator = roles.includes('narrador');

    if (!isAdmin && !isModerator && !isNarrator) {
      return NextResponse.json({ error: 'No tienes permisos de administración' }, { status: 403 });
    }

    // 1. Obtener la notificación y su registro asociado
    const { data: notif, error: notifError } = await adminClient
      .from('sys_notificaciones_admin')
      .select('*, registro:reg_registros(*)')
      .eq('id', notificacionId)
      .single();

    if (notifError || !notif) {
      return NextResponse.json({ error: 'Notificación no encontrada' }, { status: 404 });
    }

    if (notif.estado === 'resuelto') {
      return NextResponse.json({ error: 'Esta disputa ya ha sido resuelta previamente' }, { status: 400 });
    }

    const isCloneAlert = notif.registro_id === null && notif.personaje_id === null;
    const isAppeal = notif.registro_id === null && notif.personaje_id !== null;
    const isRecuperacion = notif.registro?.subtipo === 'recuperacion_evento' || notif.registro?.subtipo === 'recuperacion_narracion';
    const isNarracionTipo = notif.registro?.tipo === 'narracion' || notif.registro?.subtipo === 'narracion';

    // 2. Comprobar permisos según el rol
    if (!isAdmin && !isModerator) {
      // Narrador solo puede resolver recuperaciones de evento/narración y narraciones
      if (!isRecuperacion && !isNarracionTipo) {
        return NextResponse.json({ error: 'Los narradores solo pueden gestionar recuperaciones de eventos o narraciones' }, { status: 403 });
      }
    }

    // 3. Procesar según el tipo de notificación
    if (isCloneAlert) {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Solo los administradores pueden gestionar alertas de IP' }, { status: 403 });
      }
      if (resolucion === 'aceptada') {
        const ipMatch = notif.mensaje?.match(/\(([^)]+)\)\.?$/);
        if (ipMatch && ipMatch[1]) {
          const ip = ipMatch[1];
          await adminClient.from('sys_whitelisted_ips').upsert({
            ip,
            description: 'Auto-whitelist por aprobación de alerta de IP'
          });
        }
      }
    } else if (isAppeal) {
      if (!isAdmin && !isModerator) {
        return NextResponse.json({ error: 'Solo la administración puede gestionar apelaciones de ficha' }, { status: 403 });
      }
      if (resolucion === 'aceptada') {
        const { data: character } = await adminClient
          .from('reg_characters')
          .select('user_id, activo, nombre_ninja')
          .eq('id', notif.personaje_id)
          .single();

        if (character) {
          await adminClient
            .from('reg_characters')
            .update({ activo: true })
            .eq('id', notif.personaje_id);

          const { data: userProfile } = await adminClient
            .from('profiles')
            .select('active_char_id')
            .eq('id', character.user_id)
            .single();

          if (!userProfile?.active_char_id) {
            await adminClient
              .from('profiles')
              .update({ active_char_id: notif.personaje_id })
              .eq('id', character.user_id);
          }
        }
      }
    } else {
      // Disputa de registro o Recuperación de Evento / Narración
      if (resolucion === 'aceptada') {
        const { data: parts } = await adminClient
          .from('reg_registros_participantes')
          .select('personaje_id, estado')
          .eq('registro_id', notif.registro_id);

        const targetPids = (parts && parts.length > 0)
          ? parts.map((p: { personaje_id: number }) => p.personaje_id)
          : (notif.personaje_id ? [notif.personaje_id] : []);

        const updatedRegistroData = { ...notif.registro?.data };

        for (const pid of targetPids) {
          const partState = parts?.find((p: { personaje_id: number; estado?: string }) => Number(p.personaje_id) === Number(pid))?.estado;
          const { xp, ryous, pa } = RewardLogic.calculateReward(notif.registro, pid);

          const { data: char } = await adminClient
            .from('reg_characters')
            .select('nombre_ninja, xp, ryous, puntos_aprendizaje')
            .eq('id', pid)
            .single();

          if (char) {
            let effectiveXp = xp;
            let discardedXp = 0;
            if (partState !== 'aceptado') {
              if (xp > 0) {
                const [xpLimit, expMultiplierConfig, { totalExp }] = await Promise.all([
                  CharacterServerService.getXpLimitUsage(adminClient),
                  CharacterServerService.getExpMultiplierConfig(adminClient),
                  CharacterServerService.getCharacterTotalExp(adminClient, pid)
                ]);
                const boostedXp = RewardLogic.calculateBoostedReward(xp, totalExp, xpLimit, expMultiplierConfig);
                const capResult = RewardLogic.applyExpLimit(boostedXp, totalExp, xpLimit);
                effectiveXp = capResult.effectiveExp;
                discardedXp = capResult.discardedExp;
              }

              let effectivePa = pa;
              let discardedPa = 0;
              if (pa > 0) {
                const [paLimit, paMultiplierConfig, { totalPa }] = await Promise.all([
                  CharacterServerService.getPaLimitUsage(adminClient),
                  CharacterServerService.getPaMultiplierConfig(adminClient),
                  CharacterServerService.getCharacterTotalPA(adminClient, pid)
                ]);
                const boostedPa = RewardLogic.calculateBoostedReward(pa, totalPa, paLimit, paMultiplierConfig);
                const capResult = RewardLogic.applyPaLimit(boostedPa, totalPa, paLimit);
                effectivePa = capResult.effectivePa;
                discardedPa = capResult.discardedPa;
              }

              await adminClient.from('reg_characters').update({
                xp: (char.xp || 0) + effectiveXp,
                ryous: (char.ryous || 0) + ryous,
                puntos_aprendizaje: (char.puntos_aprendizaje || 0) + effectivePa
              }).eq('id', pid);

              updatedRegistroData.recompensas_efectivas = {
                ...(updatedRegistroData.recompensas_efectivas || {}),
                [pid]: {
                  xp_otorgada: effectiveXp,
                  xp_descartada: discardedXp,
                  pa_otorgada: effectivePa,
                  pa_descartada: discardedPa
                }
              };
            }

            // Si es recuperación de evento o narración, sincronizar en el registro de premios original
            if (isRecuperacion && notif.registro?.data?.evento_premios_id) {
              const eventoPremiosId = Number(notif.registro.data.evento_premios_id);
              const { data: regPremios } = await adminClient
                .from('reg_registros')
                .select('*')
                .eq('id', eventoPremiosId)
                .single();

              if (regPremios) {
                const currentPremios = Array.isArray(regPremios.data?.participantes_premios)
                  ? [...regPremios.data.participantes_premios]
                  : [];

                const existingIdx = currentPremios.findIndex((pr: { personaje_id: number }) => Number(pr.personaje_id) === Number(pid));
                const nuevoPremioObj = {
                  personaje_id: pid,
                  nombre_ninja: char.nombre_ninja,
                  xp_extra: Math.max(0, effectiveXp - (Number(regPremios.data?.global_xp) || 0)),
                  ryous_extra: Math.max(0, ryous - (Number(regPremios.data?.global_ryous) || 0)),
                  pa_extra: Math.max(0, pa - (Number(regPremios.data?.global_pa) || 0)),
                  recuperado: true
                };

                if (existingIdx >= 0) {
                  currentPremios[existingIdx] = { ...currentPremios[existingIdx], ...nuevoPremioObj };
                } else {
                  currentPremios.push(nuevoPremioObj);
                }

                await adminClient
                  .from('reg_registros')
                  .update({ data: { ...regPremios.data, participantes_premios: currentPremios } })
                  .eq('id', eventoPremiosId);
              }
            }
          }
        }

        if (notif.registro_id) {
          await adminClient
            .from('reg_registros')
            .update({ data: updatedRegistroData })
            .eq('id', notif.registro_id);
        }

        await adminClient
          .from('reg_registros_participantes')
          .update({ estado: 'aceptado' })
          .eq('registro_id', notif.registro_id);

      } else {
        // Rechazada -> Marcar participantes como rechazados y borrar solicitud
        await adminClient
          .from('reg_registros_participantes')
          .update({ estado: 'rechazado' })
          .eq('registro_id', notif.registro_id);

        await adminClient
          .from('reg_registros')
          .delete()
          .eq('id', notif.registro_id);
      }
    }

    // 4. Marcar la notificación como resuelta
    const { error: updateNotifError } = await adminClient
      .from('sys_notificaciones_admin')
      .update({
        estado: 'resuelto',
        resolucion
      })
      .eq('id', notificacionId);

    if (updateNotifError) {
      console.error('Error al marcar notificación como resuelta:', updateNotifError);
    }

    return NextResponse.json({ success: true, resolucion });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error interno del servidor';
    console.error('Error en /api/admin/disputas:', err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
