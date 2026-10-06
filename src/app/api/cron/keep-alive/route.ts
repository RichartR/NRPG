import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Si CRON_SECRET está configurado en las variables de entorno, validamos la petición de Vercel
    const expectedSecret = process.env.CRON_SECRET;
    if (expectedSecret) {
      const authHeader = request.headers.get('authorization');
      const { searchParams } = new URL(request.url);
      const secretParam = searchParams.get('secret') || request.headers.get('x-cron-secret');

      const isAuthorized =
        authHeader === `Bearer ${expectedSecret}` || secretParam === expectedSecret;

      if (!isAuthorized) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Credenciales de Supabase no configuradas' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Realizar una consulta ligera a la base de datos para registrar actividad
    const start = Date.now();
    const { count, error } = await supabase
      .from('info_aldeas')
      .select('id', { count: 'exact', head: true });

    if (error) {
      throw error;
    }

    const duration = Date.now() - start;

    return NextResponse.json({
      success: true,
      message: 'Keep-alive ejecutado con éxito en Supabase',
      timestamp: new Date().toISOString(),
      durationMs: duration,
      recordsFound: count ?? 0,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido al conectar con Supabase';
    console.error('Error en Supabase keep-alive cron:', error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
