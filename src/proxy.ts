import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Inyectar cabecera x-pathname para que los Server Layouts conozcan la ruta actual
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  // 1. Inicializar Supabase client y refrescar la sesión (si es necesario)
  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request: {
                headers: requestHeaders,
              },
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Esto refrescará la sesión si está expirada
    await supabase.auth.getUser()
  }

  // Excluir recursos estáticos y APIs del flujo
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return supabaseResponse;
  }

  // Si ya está en las páginas de restricción, permitir el paso sin volver a evaluar la IP
  if (pathname === '/blocked' || pathname === '/banned') {
    return supabaseResponse;
  }

  // Obtener IP pública en Vercel o local
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || '127.0.0.1';

  try {
    if (supabaseUrl && supabaseAnonKey) {
      const now = new Date().toISOString();
      const url = `${supabaseUrl}/rest/v1/sys_blocked_ips?ip=eq.${encodeURIComponent(ip)}&or=(blocked_until.is.null,blocked_until.gt.${now})&select=ip,reason`;
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
          const blockRecord = data[0];
          
          let redirectUrl: URL;
          // Si el motivo contiene baneo de cuenta, redirigir a /banned
          if (blockRecord.reason?.includes('Baneo de cuenta del usuario')) {
            redirectUrl = new URL('/banned', request.url);
          } else {
            redirectUrl = new URL('/blocked', request.url);
          }
          
          // Crear la respuesta de redirección
          const redirectResponse = NextResponse.redirect(redirectUrl);
          
          // Asegurar que copiamos las cookies de la sesión actualizada por Supabase a la respuesta de redirección
          supabaseResponse.cookies.getAll().forEach(cookie => {
            redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
          });
          
          return redirectResponse;
        }
      }
    }
  } catch (error) {
    console.error('Error checking blocked IP in proxy:', error);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
