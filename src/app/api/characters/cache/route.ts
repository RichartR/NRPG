import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ProfileService } from '@/services/supabase/profile.service';
import { invalidateCharacterListing } from '@/lib/cache-invalidation';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  let body: { id?: unknown; event?: unknown };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }
  const id = Number(body.id);
  if (!Number.isSafeInteger(id) || id <= 0 || !['portrait', 'created'].includes(String(body.event))) {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }

  const { data: character, error } = await supabase
    .from('reg_characters')
    .select('id, user_id, aldea_id')
    .eq('id', id)
    .single();
  if (error || !character) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const profile = await ProfileService.getProfile(user.id, supabase);
  const staff = profile?.roles?.some((role: string) => ['admin', 'moderador'].includes(role));
  if (character.user_id !== user.id && !staff) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  if (body.event === 'created' && !staff) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  invalidateCharacterListing(character.aldea_id ?? null, character.aldea_id ?? null,
    body.event === 'created' ? { occupancyChanged: true, recentChanged: true } : {});
  return NextResponse.json({ success: true });
}
