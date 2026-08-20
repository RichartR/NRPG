import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'

  // En producción (Vercel/proxies), request.url puede venir como http:// en vez de https://
  // Obtenemos el origen correcto usando las cabeceras x-forwarded-* o la variable de entorno
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const isLocal = process.env.NODE_ENV === 'development'

  let origin = requestUrl.origin
  if (!isLocal) {
    if (forwardedHost) {
      origin = `${forwardedProto || 'https'}://${forwardedHost}`
    } else if (process.env.NEXT_PUBLIC_APP_URL) {
      origin = process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
    }
  }

  if (code) {
    const redirectUrl = `${origin}${next}`
    const response = NextResponse.redirect(redirectUrl)
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, options)
              } catch {
                // Ignore if called from read-only context
              }
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      console.log('Auth success, redirecting to:', redirectUrl);
      return response
    }
    console.error('Auth exchange error:', error.message);
  }

  const error_description = requestUrl.searchParams.get('error_description');
  if (error_description) {
    console.error('Auth server error:', error_description);
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth-error`)
}

