import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'

  // En producción (Vercel/proxies), request.url puede venir como http:// en vez de https://
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
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const redirectUrl = `${origin}${next}`
      console.log('Auth success, redirecting to:', redirectUrl);
      return NextResponse.redirect(redirectUrl)
    }
    console.error('Auth exchange error:', error.message);
  }

  const error_description = requestUrl.searchParams.get('error_description');
  if (error_description) {
    console.error('Auth server error:', error_description);
  }

  return NextResponse.redirect(`${origin}/login?error=auth-error`)
}

