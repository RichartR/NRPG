import CharacterSheet from "@/components/character/CharacterSheet";
import LogoutButton from "@/components/auth/LogoutButton";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { ProfileService } from '@/services/supabase/profile.service';
import NotificationBell from '@/components/layout/NotificationBell';
import AdminNotificationBadge from '@/components/admin/AdminNotificationBadge';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const profile = user ? await ProfileService.getProfile(user.id) : null;

  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-12 flex flex-col">
      <header className="w-full max-w-[1800px] mx-auto mb-10 sm:mb-10 ninja-card-oro p-4 sm:p-8 xl:p-10 z-50">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6 lg:gap-10">
          <div className="flex items-center justify-between w-full lg:w-auto gap-6">
            <div className="flex items-center gap-4 md:gap-10">
              <img 
                src="/assets/ui/logo.png" 
                alt="Naruto Logo" 
                className="h-14 sm:h-20 md:h-28 w-auto object-contain drop-shadow-[0_0_20px_rgba(255,230,159,0.3)]"
              />
              <div className="hidden xl:block">
                <h1 className="ninja-title text-4xl 2xl:text-7xl">NRPG</h1>
              </div>
            </div>
            
            {user && (
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="hidden sm:flex lg:hidden 2xl:flex items-center gap-4 px-6 xl:px-10 py-4 bg-rojo-sangre/20 border border-oro/20 ninja-clip-xs">
                  {profile?.url_avatar ? (
                    <img 
                      src={profile.url_avatar} 
                      alt="Avatar" 
                      className="w-10 xl:w-12 h-10 xl:h-12 rounded-none object-cover border border-oro/40"
                    />
                  ) : (
                    <div className="w-4 h-4 bg-oro animate-pulse" />
                  )}
                  <span className="text-sm xl:text-lg 2xl:text-xl font-black text-oro uppercase tracking-widest">
                    {profile?.username || user.email?.split('@')[0]}
                  </span>
                </div>
                <NotificationBell />
              </div>
            )}
          </div>

          <nav className="flex flex-wrap justify-center gap-4 xl:gap-6 2xl:gap-10 items-center w-full lg:w-auto border-t lg:border-t-0 border-oro/5 pt-4 lg:pt-0">
            {profile?.role === 'admin' && (
              <AdminNotificationBadge />
            )}
            {user ? (
              <LogoutButton />
            ) : (
              <Link 
                href="/login" 
                className="px-8 sm:px-16 py-3 sm:py-6 ninja-btn-oro text-sm sm:text-2xl w-full sm:w-auto text-center"
              >
                INICIAR SESIÓN
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="w-full max-w-[1800px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-12">
        
        {/* Columna Izquierda: Personaje */}
        <div className="lg:col-span-5 h-full">
          <CharacterSheet />
        </div>

        {/* Columna Derecha: Bento Grid de Categorías */}
        <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-3 xl:gap-4">
          
          {/* Bienvenida */}
          <Link href="/bienvenida" className="group relative overflow-hidden ninja-card-oro p-6 xl:p-8 hover-ninja md:col-span-2 flex flex-col justify-center min-h-[140px]">
            <div className="relative z-10">
              <h3 className="text-xl sm:text-2xl xl:text-3xl font-black text-oro mb-1 flex items-center gap-4">
                <img src="https://game.gtimg.cn/images/hyrz/web2026/content-news-head.png" className="w-4 xl:w-5 h-auto object-contain" alt="icon" />
                Bienvenida
              </h3>
              <p className="text-gris-texto leading-relaxed text-sm xl:text-base max-w-2xl">Información general, reglas y primeros pasos.</p>
            </div>
          </Link>

          {/* Noticias */}
          <Link href="/noticias" className="group relative overflow-hidden ninja-card-oro p-6 xl:p-8 hover-ninja flex flex-col justify-center min-h-[140px]">
            <h3 className="text-xl sm:text-2xl xl:text-3xl font-black text-oro mb-1 flex items-center gap-4">
              <img src="https://game.gtimg.cn/images/hyrz/web2026/content-news-head.png" className="w-4 xl:w-5 h-auto object-contain" alt="icon" />
              Noticias
            </h3>
            <p className="text-gris-texto/80 text-xs xl:text-sm leading-relaxed">Anuncios oficiales y parches.</p>
          </Link>

          {/* Sistemas */}
          <Link href="/sistemas" className="group relative overflow-hidden ninja-card-oro p-6 xl:p-8 hover-ninja flex flex-col justify-center min-h-[140px]">
            <h3 className="text-xl sm:text-2xl xl:text-3xl font-black text-oro mb-1 flex items-center gap-4">
              <img src="https://game.gtimg.cn/images/hyrz/web2026/content-news-head.png" className="w-4 xl:w-5 h-auto object-contain" alt="icon" />
              Sistemas
            </h3>
            <p className="text-gris-texto/80 text-xs xl:text-sm leading-relaxed">Mecánicas y glosario técnico.</p>
          </Link>

          {/* Registros */}
          <Link href="/registros" className="group relative overflow-hidden ninja-card-oro p-6 xl:p-8 hover-ninja flex flex-col justify-center min-h-[140px]">
            <h3 className="text-xl sm:text-2xl xl:text-3xl font-black text-oro mb-1 flex items-center gap-4">
              <img src="https://game.gtimg.cn/images/hyrz/web2026/content-news-head.png" className="w-4 xl:w-5 h-auto object-contain" alt="icon" />
              Registros
            </h3>
            <p className="text-gris-texto/80 text-xs xl:text-sm leading-relaxed">Historial de misiones y combates.</p>
          </Link>

          {/* Mundo Ninja */}
          <Link href="/mundo-ninja" className="group relative overflow-hidden ninja-card-oro p-6 xl:p-8 hover-ninja flex flex-col justify-center min-h-[140px]">
            <h3 className="text-xl sm:text-2xl xl:text-3xl font-black text-oro mb-1 flex items-center gap-4">
              <img src="https://game.gtimg.cn/images/hyrz/web2026/content-news-head.png" className="w-4 xl:w-5 h-auto object-contain" alt="icon" />
              Mundo Ninja
            </h3>
            <p className="text-gris-texto/80 text-xs xl:text-sm leading-relaxed">Lore, mapa y jerarquía.</p>
          </Link>

          {/* Documentos */}
          <Link href="/documentos" className="group relative overflow-hidden ninja-card-oro p-6 xl:p-8 hover-ninja md:col-span-2 flex flex-col justify-center min-h-[140px]">
            <div className="relative z-10">
              <h3 className="text-xl sm:text-2xl xl:text-3xl font-black text-oro mb-1 flex items-center gap-4 tracking-widest">
                <img src="https://game.gtimg.cn/images/hyrz/web2026/content-news-head.png" className="w-4 xl:w-5 h-auto object-contain" alt="icon" />
                Documentos
              </h3>
              <p className="text-gris-texto leading-relaxed text-sm xl:text-base max-w-2xl">Manuales y normativa oficial del juego.</p>
            </div>
          </Link>

        </div>
      </main>
    </div>
  );
}
