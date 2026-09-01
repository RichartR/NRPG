import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { NextResponse } from 'next/server';
import { ProfileService } from '@/services/supabase/profile.service';

async function canManageNPC(supabase: any, userId: string): Promise<boolean> {
  const profile = await ProfileService.getProfile(userId, supabase);
  const userRoles = profile?.roles || [];
  return (
    userRoles.includes('admin') ||
    userRoles.includes('moderador') ||
    userRoles.includes('mod') ||
    userRoles.includes('narrador')
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const aldeaIdParam = searchParams.get('aldea_id');

    const supabase = await createClient();
    let query = supabase
      .from('info_npc')
      .select('*, aldeas:info_aldeas(id, nombre_completo, abreviatura)')
      .order('id', { ascending: true });

    if (aldeaIdParam !== null && aldeaIdParam !== undefined && aldeaIdParam !== '' && aldeaIdParam !== 'null') {
      query = query.eq('aldea_id', Number(aldeaIdParam));
    } else {
      query = query.is('aldea_id', null);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error al obtener NPCs API:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('NPC GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const hasPermission = await canManageNPC(supabase, user.id);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'No tienes permisos para crear NPCs (requiere Admin, Moderador o Narrador)' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, title, age, clan, ability, history, psychic, psicologic, img_url, aldea_id } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'El nombre del NPC es obligatorio' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('info_npc')
      .insert([
        {
          name: name.trim(),
          title: title?.trim() || null,
          age: age?.trim() || null,
          clan: clan?.trim() || null,
          ability: ability?.trim() || null,
          history: history?.trim() || null,
          psychic: psychic?.trim() || null,
          psicologic: psicologic?.trim() || null,
          img_url: img_url?.trim() || null,
          aldea_id: aldea_id ? Number(aldea_id) : null,
        },
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Error insertando NPC:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    console.error('NPC POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
