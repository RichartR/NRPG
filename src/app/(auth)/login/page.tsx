'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AuthService } from '@/services/supabase/auth.service'
import { ArrowLeft } from 'lucide-react'
import { getURL } from '@/lib/utils/url'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDiscordLogin = async () => {
    setLoading(true)
    setError(null)
    const { error } = await AuthService.signInWithDiscord(
      `${getURL()}auth/callback`
    )

    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-[550px] bg-black/60 backdrop-blur-md ninja-box ninja-border p-10 xl:p-14 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-oro/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

        {/* Volver */}
        <Link href="/" className="inline-flex items-center gap-2 text-oro/40 hover:text-oro transition-all mb-8 uppercase font-black tracking-widest text-[10px]">
          <ArrowLeft className="w-3 h-3" />
          Volver al Dashboard
        </Link>

        {/* Logo superior */}
        <div className="flex justify-center mb-10">
          <img src="/assets/ui/logo.png" className="h-20 xl:h-28 w-auto object-contain" alt="Logo" />
        </div>

        <div className="text-center mb-12">
          <h1 className="ninja-title text-4xl xl:text-6xl uppercase">
            BIENVENIDO
          </h1>
          <p className="text-oro/40 text-[10px] xl:text-xs font-black uppercase tracking-[0.4em] mt-4">
            Acceso exclusivo mediante Discord
          </p>
        </div>

        {error && (
          <div className="bg-rojo-sangre/10 border border-rojo-sangre/20 text-rojo-sangre p-4 mb-8 text-xs xl:text-sm font-bold uppercase tracking-widest text-center ninja-box">
            {error}
          </div>
        )}

        <div className="space-y-8">
          <button
            onClick={handleDiscordLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-4 bg-oro text-rojo-sangre py-5 px-6 font-black uppercase tracking-[0.2em] text-xs xl:text-sm transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
            style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
          >
            <svg className="w-5 h-5 xl:w-6 xl:h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
            </svg>
            {loading ? 'CONECTANDO...' : 'IDENTIFICARSE CON DISCORD'}
          </button>

          <div className="p-6 border border-oro/10 bg-black/40 text-center">
            <p className="text-oro/40 text-[9px] xl:text-[10px] font-black uppercase tracking-widest leading-relaxed">
              Al ingresar, aceptas que tu identidad sea vinculada a tu cuenta de Discord para la gestión de tu ficha ninja.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
