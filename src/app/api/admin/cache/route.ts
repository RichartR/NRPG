import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ProfileService } from '@/services/supabase/profile.service';
import { cacheDomains, invalidateCache, type CacheDomain } from '@/lib/cache-invalidation';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const profile = await ProfileService.getProfile(user.id, supabase);
  if (!profile?.roles?.some((role: string) => ['admin', 'moderador'].includes(role))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }
  const domain = (body as { domain?: unknown })?.domain;
  if (typeof domain !== 'string' || !Object.hasOwn(cacheDomains, domain)) {
    return NextResponse.json({ error: 'Dominio inválido' }, { status: 400 });
  }

  invalidateCache(domain as CacheDomain);
  return NextResponse.json({ success: true });
}
