import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { ProfileService } from '@/services/supabase/profile.service'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const ip = request.headers.get('cf-connecting-ip')
        || request.headers.get('x-forwarded-for')?.split(',')[0].trim()
        || request.headers.get('x-real-ip')
        || null

      if (ip) {
        const now = new Date().toISOString()
        const { data: blockedIp } = await supabase
          .from('sys_blocked_ips')
          .select('ip')
          .eq('ip', ip)
          .or(`blocked_until.is.null,blocked_until.gt.${now}`)
          .maybeSingle()

        if (blockedIp) {
          await supabase.auth.signOut()
          return NextResponse.redirect(`${origin}/blocked`)
        }
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        let profile = await ProfileService.getProfile(user.id, supabase)

        // Si el perfil no existe (porque se eliminó manualmente de profiles pero la cuenta auth.users ya existía)
        if (!profile) {
          const discordId = user.user_metadata?.sub || user.identities?.[0]?.identity_data?.sub || null
          const rawName = user.user_metadata?.full_name 
            || user.user_metadata?.preferred_username 
            || user.user_metadata?.name 
            || user.email?.split('@')[0] 
            || 'Ninja'
          const username = rawName.replace(/\s+/g, '_')

          await supabase.from('profiles').upsert({
            id: user.id,
            username,
            discord_id: discordId,
            role: 'user',
            last_ip: ip || null
          })

          profile = await ProfileService.getProfile(user.id, supabase)
        }

        if (profile?.banned_until && new Date(profile.banned_until) > new Date()) {
          return NextResponse.redirect(`${origin}/banned`)
        }

        if (ip) {
          await ProfileService.updateUserIP(user.id, ip, supabase)
        }
      }

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
