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

    // Mínimo 2 miembros (cualquier combinación de los 4 slots)
    const memberIds = [lider_id, integrante_1_id, integrante_2_id, integrante_3_id].filter(Boolean);
    if (memberIds.length < 2) {
      return NextResponse.json({ error: 'El equipo necesita mínimo 2 miembros' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('reg_equipos_ninja')
      .insert({
        nombre_equipo,
        aldea_id: Number(aldea_id),
        lider_id: lider_id ? Number(lider_id) : null,
        integrante_1_id: integrante_1_id ? Number(integrante_1_id) : null,
        integrante_2_id: integrante_2_id ? Number(integrante_2_id) : null,
        integrante_3_id: integrante_3_id ? Number(integrante_3_id) : null,
        activo: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error al insertar equipo ninja:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API equipos-ninja error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
