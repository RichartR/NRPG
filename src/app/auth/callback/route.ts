import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      console.log('Auth success, redirecting to:', next);
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error('Auth exchange error:', error.message);
  }

  const error_description = searchParams.get('error_description');
  if (error_description) {
    console.error('Auth server error:', error_description);
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth-error`)
}
