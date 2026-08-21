import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const requestedNext = requestUrl.searchParams.get('next') ?? '/'
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//')
    ? requestedNext
    : '/'

  // En producción (Vercel/proxies/Cloudflare), request.url puede venir como http:// en vez de https://
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

  const successUrl = `${origin}/auth/success?next=${encodeURIComponent(next)}`

  if (code) {
    const cookieStore = await cookies()
    // Redirección HTTP real: no depende de JavaScript inline que un proxy como
    // Cloudflare pueda retrasar o transformar. El navegador aplica primero las
    // cookies de esta respuesta y después solicita la página intermedia.
    const response = NextResponse.redirect(successUrl, 303)
    response.headers.set('cache-control', 'private, no-store, no-cache, max-age=0, must-revalidate')
    response.headers.set('cdn-cache-control', 'no-store')
    response.headers.set('cloudflare-cdn-cache-control', 'no-store')
    response.headers.set('vercel-cdn-cache-control', 'no-store')

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
              cookieStore.set(name, value, options)
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return response
    }
    console.error('Auth exchange error:', error.message)
  }

  return NextResponse.redirect(`${origin}/login?error=auth-error`)
}
