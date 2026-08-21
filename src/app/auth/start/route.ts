import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

type CookieToSet = {
  name: string
  value: string
  options: CookieOptions
}

function getOrigin(request: NextRequest) {
  if (process.env.NODE_ENV === 'development') {
    return request.nextUrl.origin
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  }

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  const protocol = request.headers.get('x-forwarded-proto') ?? 'https'

  return host ? `${protocol}://${host}` : request.nextUrl.origin
}

export async function GET(request: NextRequest) {
  const origin = getOrigin(request)
  const redirectTo = `${origin}/auth/callback`
  const cookiesToSet: CookieToSet[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(values) {
          cookiesToSet.push(...values)
        },
      },
    }
  )

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  })

  if (error || !data.url) {
    console.error('No se pudo iniciar OAuth con Discord:', error?.message)
    return NextResponse.redirect(`${origin}/login?error=oauth-start`, 303)
  }

  console.info('Iniciando OAuth con callback:', redirectTo)

  const response = NextResponse.redirect(data.url, 303)
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })
  response.headers.set('cache-control', 'private, no-store, no-cache, max-age=0, must-revalidate')

  return response
}
