import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Inyectar cabecera x-pathname para que los Server Layouts conozcan la ruta actual
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  // Excluir recursos estáticos y APIs del flujo
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    });
  }

  // Si ya está en las páginas de restricción, permitir el paso sin volver a evaluar la IP
  if (pathname === '/blocked' || pathname === '/banned') {
    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    });
  }

  // Obtener IP pública en Vercel o local
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || '127.0.0.1';

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      const now = new Date().toISOString();
      const url = `${supabaseUrl}/rest/v1/sys_blocked_ips?ip=eq.${encodeURIComponent(ip)}&or=(blocked_until.is.null,blocked_until.gt.${now})&select=ip`;
      const res = await fetch(url, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        next: { revalidate: 30 } // Cachear respuesta de la IP por 30 segundos
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          // IP bloqueada, redirigir a /blocked
          return NextResponse.redirect(new URL('/blocked', request.url));
        }
      }
    }
  } catch (error) {
    console.error('Error checking blocked IP in middleware:', error);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
