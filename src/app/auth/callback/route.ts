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
    
    const safeSuccessUrl = JSON.stringify(successUrl).replace(/</g, '\\u003c')
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="robots" content="noindex" />
          <title>Autenticando...</title>
        </head>
        <body style="background: #0a0a0a; color: #d6852d; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; font-weight: bold;">
          <p>Sincronizando sesión...</p>
          <script>
            // La ruta intermedia realiza una petición nueva con las cookies ya
            // aplicadas antes de solicitar el dashboard.
            window.setTimeout(function () {
              window.location.replace(${safeSuccessUrl});
            }, 100);
          </script>
          <noscript><a href=${safeSuccessUrl}>Continuar</a></noscript>
        </body>
      </html>
    `

    const response = new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'cdn-cache-control': 'no-store',
        'cloudflare-cdn-cache-control': 'no-store',
        'vercel-cdn-cache-control': 'no-store',
        'pragma': 'no-cache',
        'expires': '0',
      },
    })

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
