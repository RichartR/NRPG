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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const npcId = Number(id);
    if (!npcId || isNaN(npcId)) {
      return NextResponse.json({ error: 'ID de NPC no válido' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const hasPermission = await canManageNPC(supabase, user.id);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'No tienes permisos para modificar NPCs' },
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
      .update({
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
      })
      .eq('id', npcId)
      .select('*')
      .single();

    if (error) {
      console.error('Error actualizando NPC:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('NPC PUT Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const npcId = Number(id);
    if (!npcId || isNaN(npcId)) {
      return NextResponse.json({ error: 'ID de NPC no válido' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const hasPermission = await canManageNPC(supabase, user.id);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'No tienes permisos para eliminar NPCs' },
        { status: 403 }
      );
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('info_npc')
      .delete()
      .eq('id', npcId);

    if (error) {
      console.error('Error eliminando NPC:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('NPC DELETE Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
