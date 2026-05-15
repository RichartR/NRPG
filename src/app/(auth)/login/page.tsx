'use client'

import { useState } from 'react'
import { AuthService } from '@/services/supabase/auth.service'
import { LogIn, Mail, UserPlus, User } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const router = useRouter()

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    
    if (isLogin) {
      const { error } = await AuthService.signIn(email, password)

      if (error) {
        setError(error.message)
      } else {
        router.push('/')
      }
    } else {
      if (!username.trim()) {
        setError('El nombre de usuario es obligatorio.')
        setLoading(false)
        return
      }

      const { error } = await AuthService.signUp(email, password, username)

      if (error) {
        setError(error.message)
      } else {
        setSuccess('¡Registro exitoso! Revisa tu correo para confirmar (si está activado), o intenta iniciar sesión.')
        setIsLogin(true)
      }
    }
    setLoading(false)
  }

  const handleDiscordLogin = async () => {
    setLoading(true)
    const { error } = await AuthService.signInWithDiscord(
      `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback`
    )
    
    if (error) setError(error.message)
    setLoading(false)
  }

  return     <div className="min-h-screen flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-[550px] bg-black/60 backdrop-blur-md ninja-box ninja-border p-10 xl:p-14 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-oro/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        
        {/* Logo superior */}
        <div className="flex justify-center mb-10">
          <img src="/assets/ui/logo.png" className="h-20 xl:h-28 w-auto object-contain" alt="Logo" />
        </div>

        {/* Toggle Mode */}
        <div className="flex mb-10 bg-black/40 p-1.5 ninja-box border border-oro/10">
          <button
            onClick={() => { setIsLogin(true); setError(null); setSuccess(null); }}
            className={`flex-1 py-3 text-xs xl:text-sm font-black uppercase tracking-widest transition-all ${isLogin ? 'bg-rojo-sangre text-oro shadow-lg' : 'text-oro/40 hover:text-oro'}`}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(null); setSuccess(null); }}
            className={`flex-1 py-3 text-xs xl:text-sm font-black uppercase tracking-widest transition-all ${!isLogin ? 'bg-rojo-sangre text-oro shadow-lg' : 'text-oro/40 hover:text-oro'}`}
          >
            Crear Cuenta
          </button>
        </div>

        <div className="text-center mb-10">
          <h1 className="ninja-title text-4xl xl:text-6xl">
            {isLogin ? 'BIENVENIDO' : 'ÚNETE AL CLAN'}
          </h1>
          <p className="text-oro/40 text-[10px] xl:text-xs font-black uppercase tracking-[0.4em] mt-2">Acceso Seguro al Motor NRPG</p>
        </div>

        {error && (
          <div className="bg-rojo-sangre/10 border border-rojo-sangre/20 text-rojo-sangre p-4 mb-8 text-xs xl:text-sm font-bold uppercase tracking-widest text-center ninja-box">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 mb-8 text-xs xl:text-sm font-bold uppercase tracking-widest text-center ninja-box">
            {success}
          </div>
        )}

        <button
          onClick={handleDiscordLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-4 bg-oro text-rojo-sangre py-4 px-6 font-black uppercase tracking-[0.2em] text-xs xl:text-sm transition-all mb-8 hover:brightness-110 active:scale-95 disabled:opacity-50"
          style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
        >
          <svg className="w-5 h-5 xl:w-6 xl:h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
          </svg>
          {isLogin ? 'Ingresar con Discord' : 'Registrarse con Discord'}
        </button>

        <div className="relative mb-10">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-oro/10"></div>
          </div>
          <div className="relative flex justify-center text-xs xl:text-sm">
            <span className="bg-black/80 px-4 text-oro/40 font-black uppercase tracking-widest">o usa tu email</span>
          </div>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-6">
          {!isLogin && (
            <div className="space-y-2">
              <label className="block text-xs xl:text-sm font-black text-oro/60 uppercase tracking-widest ml-1">Nombre de Usuario</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-black/40 border border-oro/20 text-oro rounded-none py-4 px-6 focus:outline-none focus:border-oro transition-all text-sm xl:text-base"
                placeholder="Tu alias ninja"
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs xl:text-sm font-black text-oro/60 uppercase tracking-widest ml-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-oro/20 text-oro rounded-none py-4 px-6 focus:outline-none focus:border-oro transition-all text-sm xl:text-base"
              placeholder="ninja@konoha.com"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs xl:text-sm font-black text-oro/60 uppercase tracking-widest ml-1">Contraseña</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-oro/20 text-oro rounded-none py-4 px-6 focus:outline-none focus:border-oro transition-all text-sm xl:text-base"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rojo-sangre hover:brightness-125 text-oro font-black py-4 px-6 transition-all mt-4 disabled:opacity-50 uppercase tracking-[0.3em] text-xs xl:text-sm"
            style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
          >
            {loading ? 'Procesando...' : isLogin ? 'ENTRAR AL MUNDO' : 'FORJAR CUENTA'}
          </button>
        </form>
      </div>
    </div>
}
