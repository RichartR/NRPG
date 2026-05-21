import { createAdminClient } from '@/utils/supabase/admin';
import { CharacterServerService } from '@/services/supabase/character.server.service';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Para asegurar el cron, podemos validar una cabecera de autorización CRON_SECRET
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret') || request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const results = await CharacterServerService.cleanupCharacters(adminClient);

    return NextResponse.json({
      success: true,
      message: 'Limpieza de personajes ejecutada correctamente',
      results
    });
  } catch (error: any) {
    console.error('Cron Character Cleanup Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// También permitir GET para facilitar la ejecución/pruebas manuales
export async function GET(request: Request) {
  return POST(request);
}
