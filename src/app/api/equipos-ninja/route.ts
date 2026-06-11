import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { nombre_equipo, aldea_id, lider_id, integrante_1_id, integrante_2_id, integrante_3_id } = await request.json();

    if (!nombre_equipo || !aldea_id) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Mínimo 2 miembros en total (cualquier combinación de los 4 slots)
    const memberIds = [lider_id, integrante_1_id, integrante_2_id, integrante_3_id].filter(Boolean);
    if (memberIds.length < 2) {
      return NextResponse.json({ error: 'El equipo necesita mínimo 2 miembros' }, { status: 400 });
    }

    // Obtener active_char_id del creador
    const { data: profile } = await supabase
      .from('profiles')
      .select('active_char_id')
      .eq('id', user.id)
      .single();

    const creatorCharId = profile?.active_char_id ? Number(profile.active_char_id) : null;
    if (!creatorCharId) {
      return NextResponse.json({ error: 'No tienes un personaje activo' }, { status: 400 });
    }

    const isCreatorInTeam = [lider_id, integrante_1_id, integrante_2_id, integrante_3_id].some(id => id && Number(id) === creatorCharId);
    if (!isCreatorInTeam) {
      return NextResponse.json({ error: 'Debes formar parte del equipo que estás registrando' }, { status: 400 });
    }

    // Obtener nombre del creador
    const { data: creatorChar } = await supabase
      .from('reg_characters')
      .select('nombre_ninja')
      .eq('id', creatorCharId)
      .single();
    const creatorName = creatorChar?.nombre_ninja || 'un shinobi';

    // Almacenar sólo al creador en la fila inicial. Los demás requerirán aceptación.
    const dbLiderId = (lider_id && Number(lider_id) === creatorCharId) ? creatorCharId : null;
    const dbInt1Id = (integrante_1_id && Number(integrante_1_id) === creatorCharId) ? creatorCharId : null;
    const dbInt2Id = (integrante_2_id && Number(integrante_2_id) === creatorCharId) ? creatorCharId : null;
    const dbInt3Id = (integrante_3_id && Number(integrante_3_id) === creatorCharId) ? creatorCharId : null;

    // Crear el equipo inactivo inicialmente
    const { data: team, error } = await supabase
      .from('reg_equipos_ninja')
      .insert({
        nombre_equipo,
        aldea_id: Number(aldea_id),
        lider_id: dbLiderId,
        integrante_1_id: dbInt1Id,
        integrante_2_id: dbInt2Id,
        integrante_3_id: dbInt3Id,
        activo: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error al insertar equipo ninja:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Generar las invitaciones para los otros miembros
    const invitedCharIds = [lider_id, integrante_1_id, integrante_2_id, integrante_3_id]
      .filter(id => id && Number(id) !== creatorCharId)
      .map(Number);

    if (invitedCharIds.length > 0) {
      // Crear el registro de propuesta/invitación
      const { data: registro, error: regError } = await supabase
        .from('reg_registros')
        .insert({
          tipo: 'accion',
          subtipo: 'equipo_invitacion',
          autor_id: creatorCharId,
          data: {
            titulo: `Propuesta de nuevo equipo: ${nombre_equipo}`,
            subtitulo: `Has sido invitado a formar parte del equipo '${nombre_equipo}' por ${creatorName}.`,
            tipo_accion: 'invitacion_equipo',
            equipo_id: team.id,
            nombre_equipo: nombre_equipo,
            propuesta_miembros: {
              lider_id: lider_id ? Number(lider_id) : null,
              integrante_1_id: integrante_1_id ? Number(integrante_1_id) : null,
              integrante_2_id: integrante_2_id ? Number(integrante_2_id) : null,
              integrante_3_id: integrante_3_id ? Number(integrante_3_id) : null
            }
          }
        })
        .select()
        .single();

      if (regError) {
        console.error('Error al crear registro de invitación de equipo:', regError);
        return NextResponse.json({ error: regError.message }, { status: 500 });
      }

      // Insertar participantes en estado pendiente
      const participaciones = invitedCharIds.map(charId => ({
        registro_id: registro.id,
        personaje_id: charId,
        estado: 'pendiente'
      }));

      const { error: partError } = await supabase
        .from('reg_registros_participantes')
        .insert(participaciones);

      if (partError) {
        console.error('Error al insertar participantes de invitación de equipo:', partError);
        return NextResponse.json({ error: partError.message }, { status: 500 });
      }
    }

    return NextResponse.json(team);
  } catch (error: any) {
    console.error('API equipos-ninja error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
