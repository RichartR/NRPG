'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, LoaderCircle } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

type Status = 'checking' | 'success' | 'error'

function getSafeDestination() {
  const requested = new URLSearchParams(window.location.search).get('next') ?? '/'
  return requested.startsWith('/') && !requested.startsWith('//') ? requested : '/'
}

export default function AuthSuccessPage() {
  const [status, setStatus] = useState<Status>('checking')

  useEffect(() => {
    let redirectTimer: ReturnType<typeof setTimeout> | undefined
    let cancelled = false

    const confirmSession = async () => {
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()

      if (cancelled) return

      if (error || !user) {
        setStatus('error')
        return
      }

      setStatus('success')
      redirectTimer = setTimeout(() => {
        window.location.replace(getSafeDestination())
      }, 1500)
    }

    confirmSession()

    return () => {
      cancelled = true
      if (redirectTimer) clearTimeout(redirectTimer)
    }
  }, [])

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <section className="w-full max-w-[550px] bg-black/60 backdrop-blur-md ninja-box ninja-border p-10 xl:p-14 shadow-2xl text-center">
        {status === 'checking' && (
          <>
            <LoaderCircle className="w-16 h-16 mx-auto mb-7 text-oro animate-spin" />
            <h1 className="ninja-title text-3xl xl:text-5xl uppercase">
              Verificando acceso
            </h1>
            <p className="mt-5 text-oro/50 text-xs font-black uppercase tracking-[0.3em]">
              Sincronizando tu sesión
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="w-16 h-16 mx-auto mb-7 text-oro" />
            <h1 className="ninja-title text-3xl xl:text-5xl uppercase">
              Acceso correcto
            </h1>
            <p className="mt-5 text-oro/50 text-xs font-black uppercase tracking-[0.3em]">
              Entrando al dashboard...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertTriangle className="w-16 h-16 mx-auto mb-7 text-naranja-naruto" />
            <h1 className="ninja-title text-3xl xl:text-5xl uppercase">
              No se pudo confirmar la sesión
            </h1>
            <p className="mt-5 mb-8 text-oro/50 text-xs font-black uppercase tracking-[0.2em] leading-relaxed">
              La cookie todavía no está disponible. Puedes volver a intentarlo.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full ninja-btn-oro px-6 py-4 text-xs font-black uppercase tracking-widest"
            >
              Reintentar
            </button>
          </>
        )}
      </section>
    </main>
  )
}
