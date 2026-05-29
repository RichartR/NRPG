import CharacterSheet from "@/components/character/CharacterSheet";
import LogoutButton from "@/components/auth/LogoutButton";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { ProfileService } from '@/services/supabase/profile.service';
import NotificationBell from '@/components/layout/NotificationBell';
import AdminNotificationBadge from '@/components/admin/AdminNotificationBadge';
import ProfileSettings from '@/components/layout/ProfileSettings';
import { unstable_cache } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import {
  User,
  ScrollText,
  Swords,
  ShoppingBag,
  Coins,
  Sparkles,
  ArrowRight,
  MessageSquare,
  UserPlus,
  BookOpen
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const publicClient = createSupabaseClient(supabaseUrl, supabaseAnonKey);

const getCachedRegistros = unstable_cache(
  async () => {
    const { data } = await publicClient
      .from('reg_registros')
      .select(`
        id,
        tipo,
        subtipo,
        fecha,
        data,
        autor_id,
        autor: reg_characters!reg_registros_autor_id_fkey(nombre_ninja, url_img)
      `)
      .or("tipo.in.(mision,combate,compra),subtipo.eq.evento_premios,subtipo.eq.narracion")
      .order('fecha', { ascending: false })
      .range(0, 19);
    return data || [];
  },
  ['latest-registros'],
  { revalidate: 30 }
);

const getCachedCharacters = unstable_cache(
  async () => {
    const { data } = await publicClient
      .from('reg_characters')
      .select(`
        id,
        nombre_ninja,
        created_at,
        url_img,
        rango,
        aldeas: info_aldeas(nombre_completo, abreviatura)
      `)
      .eq('activo', true)
      .order('created_at', { ascending: false })
      .range(0, 9);
    return data || [];
  },
  ['latest-characters'],
  { revalidate: 30 }
);

const getCachedNoticias = unstable_cache(
  async () => {
    const { data } = await publicClient
      .from('info_noticias_index')
      .select('*')
      .eq('activo', true)
      .order('created_at', { ascending: false })
      .range(0, 9);
    return data || [];
  },
  ['latest-noticias'],
  { revalidate: 30 }
);

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'hace unos instantes';
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours} h`;
  if (diffDays === 1) return 'ayer';
  return `hace ${diffDays} días`;
}

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const profile = user ? await ProfileService.getProfile(user.id) : null;

  const [registros, characters, noticias] = await Promise.all([
    getCachedRegistros(),
    getCachedCharacters(),
    getCachedNoticias()
  ]);

  // Merge and sort chronologically
  const events: any[] = [];

  registros.forEach((reg: any) => {
    if (reg.tipo === 'accion' && reg.subtipo !== 'evento_premios' && reg.subtipo !== 'narracion') return;

    let targetLink = '/registros';
    if (reg.tipo === 'mision') {
      targetLink = '/registros/misiones';
    } else if (reg.tipo === 'combate') {
      targetLink = '/registros/combates';
    } else if (reg.tipo === 'compra') {
      targetLink = '/registros/tiendas';
    } else if (reg.subtipo === 'narracion') {
      targetLink = '/registros/narracion';
    }

    events.push({
      id: `reg-${reg.id}`,
      tipo: reg.subtipo === 'evento_premios' ? 'evento_premios' : reg.subtipo === 'narracion' ? 'narracion' : reg.tipo,
      fecha: reg.fecha,
      timestamp: new Date(reg.fecha).getTime(),
      data: reg.data,
      autorName: reg.autor?.nombre_ninja || reg.data.autor_admin?.username || reg.data.narrador || 'Admin / Narrador',
      avatarUrl: reg.subtipo === 'narracion'
        ? '/assets/images/narracion.png'
        : (reg.autor?.url_img || null),
      link: targetLink
    });
  });

  characters.forEach((char: any) => {
    events.push({
      id: `char-${char.id}`,
      tipo: 'nuevo_personaje',
      fecha: char.created_at || new Date().toISOString(),
      timestamp: new Date(char.created_at || new Date()).getTime(),
      data: {
        nombre: char.nombre_ninja,
        rango: char.rango,
        aldea: char.aldeas?.abreviatura || char.aldeas?.nombre_completo || 'Sin Aldea / Renegado'
      },
      autorName: char.nombre_ninja,
      avatarUrl: char.url_img || null,
      link: `/ficha/${char.id}`
    });
  });

  noticias.forEach((news: any) => {
    events.push({
      id: `news-${news.id}`,
      tipo: news.categoria?.toLowerCase() || 'noticia',
      fecha: news.created_at || new Date().toISOString(),
      timestamp: new Date(news.created_at || new Date()).getTime(),
      data: {
        titulo: news.titulo,
        categoria: news.categoria || 'NOTICIA'
      },
      autorName: 'Muro de Anuncios',
      avatarUrl: news.url_imagen || '/assets/ui/logo.png',
      link: `/noticias`
    });
  });

  events.sort((a, b) => b.timestamp - a.timestamp);
  const latestEvents = events.slice(0, 10);

  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-12 flex flex-col">
      <header className="w-full max-w-[1800px] mx-auto mb-10 sm:mb-10 ninja-card-oro p-6 sm:p-8 xl:p-10 z-50">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6 lg:gap-10">
          {/* Logo and Branding */}
          <div className="flex items-center gap-4 md:gap-10 justify-center lg:justify-start w-full lg:w-auto">
            <img
              src="/assets/ui/logo.png"
              alt="Naruto Logo"
              className="h-14 sm:h-20 md:h-24 xl:h-28 w-auto object-contain drop-shadow-[0_0_20px_rgba(255,230,159,0.3)]"
            />
            <div>
              <h1 className="ninja-title text-3xl sm:text-5xl lg:text-6xl xl:text-7xl leading-none">NRPG</h1>
            </div>
          </div>

          {/* Controls and Navigation */}
          <div className="flex flex-wrap items-center justify-center lg:justify-end gap-4 sm:gap-6 w-full lg:w-auto border-t lg:border-t-0 border-oro/5 pt-4 lg:pt-0">
            {user && (
              <div className="flex items-center gap-4 sm:gap-6">
                <ProfileSettings profile={profile} userId={user.id} />
                <NotificationBell />
              </div>
            )}

            <nav className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              {profile?.role === 'admin' && (
                <>
                  <Link
                    href="/admin"
                    className="flex items-center gap-3 px-5 py-2.5 bg-oro/5 text-oro border border-oro/20 hover:bg-oro/10 hover:border-oro/40 transition-all group font-black text-[10px] uppercase tracking-widest cursor-pointer"
                    style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
                  >
                    PANEL ADMIN
                  </Link>
                  <AdminNotificationBadge />
                </>
              )}
              {user ? (
                <LogoutButton />
              ) : (
                <Link
                  href="/login"
                  className="px-6 py-3.5 ninja-btn-oro text-xs sm:text-sm font-black uppercase tracking-widest text-center"
                >
                  INICIAR SESIÓN
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="w-full max-w-[1800px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-12">

        {/* Columna Izquierda: Personaje */}
        <div className="lg:col-span-5 h-full">
          <CharacterSheet />
        </div>

        {/* Columna Derecha: Bento Grid de Categorías + Actividad Reciente */}
        <div className="lg:col-span-7 flex flex-col gap-6 xl:gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 xl:gap-4">

            {/* Bienvenida */}
            <Link href="/bienvenida" className="group relative overflow-hidden ninja-card-oro p-6 xl:p-8 hover-ninja md:col-span-2 flex flex-col justify-center min-h-[140px]">
              <div className="relative z-10">
                <h3 className="text-xl sm:text-2xl xl:text-3xl font-black text-oro mb-1 flex items-center gap-4">
                  <img src="/assets/icons/shuriken.png" className="w-4 xl:w-5 h-auto object-contain" alt="icon" />
                  Bienvenida
                </h3>
                <p className="text-gris-texto leading-relaxed text-sm xl:text-base max-w-2xl">Información general, reglas y primeros pasos.</p>
              </div>
            </Link>

            {/* Noticias */}
            <Link href="/noticias" className="group relative overflow-hidden ninja-card-oro p-6 xl:p-8 hover-ninja flex flex-col justify-center min-h-[140px]">
              <h3 className="text-xl sm:text-2xl xl:text-3xl font-black text-oro mb-1 flex items-center gap-4">
                <img src="/assets/icons/shuriken.png" className="w-4 xl:w-5 h-auto object-contain" alt="icon" />
                Noticias y Eventos
              </h3>
              <p className="text-gris-texto/80 text-xs xl:text-sm leading-relaxed">Anuncios oficiales y parches.</p>
            </Link>

            {/* Sistemas */}
            <Link href="/sistemas" className="group relative overflow-hidden ninja-card-oro p-6 xl:p-8 hover-ninja flex flex-col justify-center min-h-[140px]">
              <h3 className="text-xl sm:text-2xl xl:text-3xl font-black text-oro mb-1 flex items-center gap-4">
                <img src="/assets/icons/shuriken.png" className="w-4 xl:w-5 h-auto object-contain" alt="icon" />
                Sistemas
              </h3>
              <p className="text-gris-texto/80 text-xs xl:text-sm leading-relaxed">Mecánicas y glosario técnico.</p>
            </Link>

            {/* Registros */}
            <Link href="/registros" className="group relative overflow-hidden ninja-card-oro p-6 xl:p-8 hover-ninja flex flex-col justify-center min-h-[140px]">
              <h3 className="text-xl sm:text-2xl xl:text-3xl font-black text-oro mb-1 flex items-center gap-4">
                <img src="/assets/icons/shuriken.png" className="w-4 xl:w-5 h-auto object-contain" alt="icon" />
                Tiendas y Registros
              </h3>
              <p className="text-gris-texto/80 text-xs xl:text-sm leading-relaxed">Historial de misiones y combates.</p>
            </Link>

            {/* Mundo Ninja */}
            <Link href="/mundo-ninja" className="group relative overflow-hidden ninja-card-oro p-6 xl:p-8 hover-ninja flex flex-col justify-center min-h-[140px]">
              <h3 className="text-xl sm:text-2xl xl:text-3xl font-black text-oro mb-1 flex items-center gap-4">
                <img src="/assets/icons/shuriken.png" className="w-4 xl:w-5 h-auto object-contain" alt="icon" />
                Mundo Ninja
              </h3>
              <p className="text-gris-texto/80 text-xs xl:text-sm leading-relaxed">Lore, mapa y jerarquía.</p>
            </Link>

            {/* Documentos */}
            <Link href="/documentos" className="group relative overflow-hidden ninja-card-oro p-6 xl:p-8 hover-ninja md:col-span-2 flex flex-col justify-center min-h-[140px]">
              <div className="relative z-10">
                <h3 className="text-xl sm:text-2xl xl:text-3xl font-black text-oro mb-1 flex items-center gap-4 tracking-widest">
                  <img src="/assets/icons/shuriken.png" className="w-4 xl:w-5 h-auto object-contain" alt="icon" />
                  Documentos
                </h3>
                <p className="text-gris-texto leading-relaxed text-sm xl:text-base max-w-2xl">Manuales y normativa oficial del juego.</p>
              </div>
            </Link>

          </div>

          {/* Actividad Reciente del Servidor (ForumCommunity Style) */}
          <div className="ninja-card-oro p-6 xl:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.01] pointer-events-none">
              <MessageSquare className="w-40 h-40 rotate-12 text-oro" />
            </div>

            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-oro/10 relative z-10">
              <div className="w-2 xl:w-2.5 h-2 xl:h-2.5 bg-rojo-sangre rotate-45" />
              <h3 className="text-lg xl:text-2xl font-black text-oro tracking-[0.2em] uppercase font-ninja pt-1">
                Última Actividad Ninja
              </h3>
            </div>

            <div className="relative z-10 divide-y divide-oro/5 max-h-[385px] overflow-y-auto custom-scrollbar pr-1">
              {latestEvents && latestEvents.length > 0 ? (
                latestEvents.map((event) => {
                  const authorName = event.autorName;
                  const timeStr = formatRelativeTime(event.fecha);

                  let typeLabel = '';
                  let typeColor = '';
                  let titleText = '';
                  let iconElement = null;
                  let rewardElement = null;

                  switch (event.tipo) {
                    case 'nuevo_personaje':
                      typeLabel = 'Nuevo Shinobi';
                      typeColor = 'border-green-500/30 text-green-400 bg-green-950/20';
                      titleText = `¡Un nuevo shinobi llega al mundo ninja: ${event.data?.nombre || 'Shinobi'}!`;
                      iconElement = <UserPlus className="w-4 h-4 text-green-400/60" />;
                      rewardElement = (
                        <span className="text-[10px] xl:text-xs font-black text-oro/80 uppercase tracking-widest px-3 py-1 bg-oro/10 border border-oro/10 ninja-clip-xs">
                          {event.data?.aldea || 'Renegado'}
                        </span>
                      );
                      break;
                    case 'evento_premios':
                      typeLabel = 'Premios Evento';
                      typeColor = 'border-amber-500/30 text-amber-400 bg-amber-950/20';
                      titleText = event.data?.titulo || 'Reparto de Premios';
                      iconElement = <Sparkles className="w-4 h-4 text-amber-400/60" />;

                      const rewardParts = [];
                      if (event.data?.global_xp) {
                        rewardParts.push(
                          <span key="xp" className="flex items-center gap-1">
                            +{event.data.global_xp} EXP
                          </span>
                        );
                      }
                      if (event.data?.global_ryous) {
                        rewardParts.push(
                          <span key="ryous" className="flex items-center gap-1">
                            +{event.data.global_ryous} RYOUS
                          </span>
                        );
                      }
                      if (event.data?.global_monedas_evento) {
                        rewardParts.push(
                          <span key="evento" className="flex items-center gap-1 text-oro/60">
                            +{event.data.global_monedas_evento} M. EVENTO
                          </span>
                        );
                      }

                      if (rewardParts.length > 0) {
                        rewardElement = (
                          <div className="flex flex-wrap items-center gap-2.5 text-[10px] xl:text-xs font-bold text-oro/60">
                            {rewardParts}
                          </div>
                        );
                      }
                      break;
                    case 'mision':
                      typeLabel = 'Misión';
                      typeColor = 'border-oro/30 text-oro bg-oro/5';
                      titleText = `Completada: Misión Rango ${event.data?.rango || ''} (${event.data?.codigo_mision || 'General'})`;
                      iconElement = <ScrollText className="w-4 h-4 text-oro/60" />;
                      if (event.data?.recompensa_xp || event.data?.recompensa_ryous) {
                        rewardElement = (
                          <div className="flex items-center gap-3 text-[10px] xl:text-xs font-bold text-oro/60">
                            {event.data.recompensa_xp > 0 && <span className="flex items-center gap-1">+{event.data.recompensa_xp} EXP</span>}
                            {event.data.recompensa_ryous > 0 && <span className="flex items-center gap-1">+{event.data.recompensa_ryous} RYOUS</span>}
                          </div>
                        );
                      }
                      break;
                    case 'narracion':
                      typeLabel = 'Narración';
                      typeColor = 'border-purple-500/30 text-purple-400 bg-purple-950/20';
                      titleText = `Nueva Crónica por ${event.data?.narrador || 'Narrador'}`;
                      iconElement = <BookOpen className="w-4 h-4 text-purple-400/60" />;

                      const rewardPartsNarr = [];
                      if (event.data?.global_xp) {
                        rewardPartsNarr.push(
                          <span key="xp" className="flex items-center gap-1">
                            +{event.data.global_xp} EXP
                          </span>
                        );
                      }
                      if (event.data?.global_ryous) {
                        rewardPartsNarr.push(
                          <span key="ryous" className="flex items-center gap-1">
                            +{event.data.global_ryous} RYOUS
                          </span>
                        );
                      }
                      if (event.data?.global_monedas_evento) {
                        rewardPartsNarr.push(
                          <span key="evento" className="flex items-center gap-1 text-oro/60">
                            +{event.data.global_monedas_evento} M. EVENTO
                          </span>
                        );
                      }

                      if (rewardPartsNarr.length > 0) {
                        rewardElement = (
                          <div className="flex flex-wrap items-center gap-2.5 text-[10px] xl:text-xs font-bold text-oro/60">
                            {rewardPartsNarr}
                          </div>
                        );
                      }
                      break;
                    case 'combate':
                      typeLabel = 'Combate';
                      typeColor = 'border-red-600/40 text-red-500 bg-red-950/20';
                      const teamA = event.data?.equipo_a || [];
                      const teamB = event.data?.equipo_b || [];
                      const namesA = teamA.map((p: any) => p.nombre_ninja).join(', ');
                      const namesB = teamB.map((p: any) => p.nombre_ninja).join(', ');
                      titleText = `Encuentro: ${namesA || 'Bando A'} vs ${namesB || 'Bando B'}`;
                      iconElement = <Swords className="w-4 h-4 text-red-500/60" />;
                      break;
                    case 'compra':
                      typeLabel = 'Compra';
                      typeColor = 'border-oro/20 text-oro bg-oro/5';
                      titleText = `¡${event.autorName} ha adquirido ${event.data?.objeto || 'un artículo'}!`;
                      iconElement = <ShoppingBag className="w-4 h-4 text-oro/60" />;

                      const costParts = [];
                      if (event.data?.coste_ryous) {
                        costParts.push(
                          <span key="ryous" className="flex items-center gap-1">
                            -{event.data.coste_ryous.toLocaleString()} RYOUS
                          </span>
                        );
                      }
                      if (event.data?.coste_exp) {
                        costParts.push(
                          <span key="exp" className="flex items-center gap-1">
                            -{event.data.coste_exp.toLocaleString()} EXP
                          </span>
                        );
                      }
                      if (event.data?.coste_moneda_evento) {
                        costParts.push(
                          <span key="evento" className="flex items-center gap-1">
                            -{event.data.coste_moneda_evento.toLocaleString()} M. EVENTO
                          </span>
                        );
                      }

                      if (costParts.length > 0) {
                        rewardElement = (
                          <div className="flex flex-wrap items-center gap-2.5 text-[10px] xl:text-xs font-bold text-oro/60">
                            {costParts}
                          </div>
                        );
                      }
                      break;
                    case 'noticia':
                    case 'parche':
                    case 'evento':
                      typeLabel = event.data?.categoria || 'Anuncio';
                      if (event.tipo === 'evento') {
                        typeColor = 'border-amber-500/30 text-amber-400 bg-amber-950/20';
                      } else if (event.tipo === 'parche') {
                        typeColor = 'border-blue-500/30 text-blue-400 bg-blue-950/20';
                      } else {
                        typeColor = 'border-purple-500/30 text-purple-400 bg-purple-950/20';
                      }
                      titleText = event.data?.titulo || 'Anuncio Oficial';
                      iconElement = <MessageSquare className="w-4 h-4 text-purple-400/60" />;
                      break;
                    default:
                      typeLabel = 'Actividad';
                      typeColor = 'border-oro/30 text-oro bg-oro/5';
                      titleText = 'Evento del servidor';
                      iconElement = <MessageSquare className="w-4 h-4 text-oro/60" />;
                      break;
                  }

                  return (
                    <div key={event.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4 hover:bg-oro/5 transition-all duration-300 group px-2">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        {/* Avatar con mini-badge */}
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 xl:w-12 xl:h-12 border border-oro/20 bg-black/40 overflow-hidden flex items-center justify-center ninja-clip-xs group-hover:border-oro/40 transition-all">
                            {event.avatarUrl ? (
                              <img
                                src={event.avatarUrl}
                                className="w-full h-full object-cover object-top"
                                alt="Avatar"
                              />
                            ) : (
                              <User className="w-5 h-5 text-oro/35" />
                            )}
                          </div>
                          {/* Mini-badge del tipo de actividad */}
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border border-oro/20 flex items-center justify-center shadow-lg bg-black/90 p-0.5">
                            {event.tipo === 'nuevo_personaje' && <UserPlus className="w-2.5 h-2.5 text-green-400" />}
                            {event.tipo === 'evento_premios' && <Sparkles className="w-2.5 h-2.5 text-amber-400" />}
                            {event.tipo === 'mision' && <ScrollText className="w-2.5 h-2.5 text-oro" />}
                            {event.tipo === 'combate' && <Swords className="w-2.5 h-2.5 text-red-500" />}
                            {event.tipo === 'compra' && <ShoppingBag className="w-2.5 h-2.5 text-amber-500" />}
                            {event.tipo === 'narracion' && <BookOpen className="w-2.5 h-2.5 text-purple-400" />}
                            {(event.tipo === 'noticia' || event.tipo === 'parche' || event.tipo === 'evento') && <MessageSquare className="w-2.5 h-2.5 text-purple-400" />}
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border ${typeColor}`}>
                              {typeLabel}
                            </span>
                            <span className="text-xs font-bold text-oro/80 truncate font-ninja uppercase tracking-widest block">
                              {titleText}
                            </span>
                          </div>
                          {event.tipo === 'nuevo_personaje' ? (
                            <p className="text-[10px] text-gris-texto/60 font-black uppercase tracking-wider">
                              <span className="text-oro/60">Publicado:</span> {timeStr}
                            </p>
                          ) : (event.tipo === 'noticia' || event.tipo === 'parche' || event.tipo === 'evento') ? (
                            <p className="text-[10px] text-gris-texto/60 font-black uppercase tracking-wider">
                              Publicado en <span className="text-oro/60">{authorName}</span> <span className="text-oro/20">•</span> {timeStr}
                            </p>
                          ) : (
                            <p className="text-[10px] text-gris-texto/60 font-black uppercase tracking-wider">
                              Por <span className="text-oro/60">{authorName}</span> <span className="text-oro/20">•</span> {timeStr}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 self-end sm:self-auto">
                        {rewardElement}
                        <Link
                          href={event.link}
                          className="p-1.5 bg-black/40 border border-oro/10 hover:border-oro hover:bg-oro/20 text-oro/60 hover:text-oro transition-all ninja-clip-xs"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-gris-texto/40 font-black uppercase tracking-widest italic">
                    El silencio impera en las aldeas. No hay actividad reciente registrada.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
