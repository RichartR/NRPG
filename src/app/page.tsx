import CharacterSheet from "@/components/character/CharacterSheet";
import LogoutButton from "@/components/auth/LogoutButton";
import { BookOpen, Megaphone, ScrollText, Globe, Zap, User, ShieldAlert, Map, GitBranch } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Obtener perfil para el nombre y el rol
  const { data: profile } = user ? await supabase
    .from('profiles')
    .select('username, role')
    .eq('id', user.id)
    .single() : { data: null };

  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-8">
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-8 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500 tracking-tighter">
            NRPG Engine
          </h1>
          
          {user && (
            <div className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-zinc-950 border border-zinc-800 rounded-full">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                {profile?.username || user.email?.split('@')[0]}
              </span>
            </div>
          )}
        </div>

        <nav className="flex gap-4 items-center">
          {profile?.role === 'admin' && (
            <Link 
              href="/admin" 
              className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded-xl text-xs font-black hover:bg-orange-500 hover:text-white transition-all group"
            >
              <ShieldAlert className="w-4 h-4" />
              ADMIN PANEL
            </Link>
          )}
          <LogoutButton />
        </nav>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Columna Izquierda: Personaje (Ocupa 5 columnas) */}
        <div className="lg:col-span-5 space-y-6">
          <CharacterSheet />
        </div>

        {/* Columna Derecha: Bento Grid de Categorías (Ocupa 7 columnas) */}
        <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Bienvenida */}
          <Link href="/bienvenida" className="group relative overflow-hidden bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 hover:border-orange-500/50 p-6 rounded-3xl transition-all hover:shadow-[0_0_30px_-5px_rgba(249,115,22,0.3)] md:col-span-2">
            <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
              <BookOpen className="w-32 h-32 text-orange-500" />
            </div>
            <div className="relative z-10">
              <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-orange-500" />
                Bienvenida
              </h3>
              <p className="text-zinc-400 max-w-sm">Información general, reglas del juego y primeros pasos en el rol.</p>
            </div>
          </Link>

          {/* Noticias y Eventos */}
          <Link href="/noticias" className="group relative overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 p-6 rounded-3xl transition-all hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)]">
            <div className="absolute -bottom-4 -right-4 opacity-10 group-hover:scale-110 transition-transform">
              <Megaphone className="w-24 h-24 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-blue-500" />
              Noticias y Eventos
            </h3>
            <p className="text-zinc-400 text-sm">Actualizaciones, parches y anuncios de la administración.</p>
          </Link>

          {/* Sistemas */}
          <Link href="/sistemas" className="group relative overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-red-500/50 p-6 rounded-3xl transition-all hover:shadow-[0_0_30px_-5px_rgba(239,68,68,0.3)]">
            <div className="absolute -bottom-4 -right-4 opacity-10 group-hover:scale-110 transition-transform">
              <Zap className="w-24 h-24 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Zap className="w-5 h-5 text-red-500" />
              Sistemas
            </h3>
            <p className="text-zinc-400 text-sm">Glosario de técnicas, calculadora de combate y mecánicas.</p>
          </Link>

          {/* Registros */}
          <Link href="/registros" className="group relative overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-purple-500/50 p-6 rounded-3xl transition-all hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.3)]">
            <div className="absolute -bottom-4 -right-4 opacity-10 group-hover:scale-110 transition-transform">
              <ScrollText className="w-24 h-24 text-purple-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-purple-500" />
              Registros
            </h3>
            <p className="text-zinc-400 text-sm">Feed de misiones, combates y validación de recompensas.</p>
          </Link>

          {/* Mundo Ninja */}
          <Link href="/mundo-ninja" className="group relative overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 p-6 rounded-3xl transition-all hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]">
            <div className="absolute -bottom-4 -right-4 opacity-10 group-hover:scale-110 transition-transform">
              <Globe className="w-24 h-24 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-500" />
              Mundo Ninja
            </h3>
            <p className="text-zinc-400 text-sm">Lore, mapa, jerarquía de aldeas e información del entorno.</p>
          </Link>

          {/* Documentos */}
          <Link href="/documentos" className="group relative overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 p-6 rounded-3xl transition-all hover:shadow-[0_0_30px_-5px_rgba(245,158,11,0.3)]">
            <div className="absolute -bottom-4 -right-4 opacity-10 group-hover:scale-110 transition-transform">
              <ScrollText className="w-24 h-24 text-amber-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-amber-500" />
              Documentos
            </h3>
            <p className="text-zinc-400 text-sm">Normativas de combate, tablas de balanceo y manuales.</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
