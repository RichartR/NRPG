import Link from 'next/link';
import { Settings, BookOpen, Map, GitBranch, Sword, ChevronRight, ScrollText, ShieldAlert, ShoppingBag } from 'lucide-react';

export default function AdminPage() {
  const modules = [
    {
      title: 'Sistemas',
      desc: 'Manuales, reglas base y sistemas generales del RPG.',
      icon: Settings,
      href: '/admin/sistemas',
      color: 'text-oro',
      bgColor: 'bg-oro/10',
      borderColor: 'hover:border-oro/50'
    },
    {
      title: 'Aldeas',
      desc: 'Gestionar las 5 grandes naciones, sus banners e imágenes.',
      icon: Map,
      href: '/admin/aldeas',
      color: 'text-oro',
      bgColor: 'bg-oro/10',
      borderColor: 'hover:border-oro/50'
    },
    {
      title: 'Misiones',
      desc: 'Gestionar las misiones maestras, sus rangos y recompensas.',
      icon: ScrollText,
      href: '/admin/misiones',
      color: 'text-oro',
      bgColor: 'bg-oro/10',
      borderColor: 'hover:border-oro/50'
    },
    {
      title: 'Tiendas Ninja',
      desc: 'Gestionar tiendas, divisas de evento, reinicios y catálogos.',
      icon: ShoppingBag,
      href: '/registros/tiendas',
      color: 'text-oro',
      bgColor: 'bg-oro/10',
      borderColor: 'hover:border-oro/50'
    },
    {
      title: 'Ramas y Clanes',
      desc: 'Crear especialidades y vincular clanes a sus aldeas.',
      icon: GitBranch,
      href: '/admin/ramas',
      color: 'text-oro',
      bgColor: 'bg-oro/10',
      borderColor: 'hover:border-oro/50'
    },
    {
      title: 'Documentos',
      desc: 'Gestionar técnicas, jutsus y habilidades de combate.',
      icon: Sword,
      href: '/admin/combate',
      color: 'text-rojo-sangre',
      bgColor: 'bg-rojo-sangre/10',
      borderColor: 'hover:border-rojo-sangre/50'
    },
    {
      title: 'Glosario',
      desc: 'Control central de técnicas, objetos y pasivas del juego.',
      icon: BookOpen,
      href: '/admin/glosario',
      color: 'text-oro',
      bgColor: 'bg-oro/10',
      borderColor: 'hover:border-oro/50'
    },
    {
      title: 'Estados de Combate',
      desc: 'Configurar estados post-combate (Herido, Muerto, etc.).',
      icon: Sword,
      href: '/admin/combate-estados',
      color: 'text-rojo-sangre',
      bgColor: 'bg-rojo-sangre/10',
      borderColor: 'hover:border-rojo-sangre/50'
    },
    {
      title: 'Disputas',
      desc: 'Atiende rechazos y validación de recompensas.',
      icon: ShieldAlert,
      href: '/admin/disputas',
      color: 'text-oro',
      bgColor: 'bg-oro/10',
      borderColor: 'hover:border-oro/50'
    },
    {
      title: 'Variables de Sistema',
      desc: 'Configurar escalados, reglas de rango y constantes globales.',
      icon: Settings,
      href: '/admin/config',
      color: 'text-oro',
      bgColor: 'bg-oro/10',
      borderColor: 'hover:border-oro/50'
    },
    {
      title: 'Fichas Archivadas',
      desc: 'Recuperar fichas inactivas o archivadas por los usuarios.',
      icon: ShieldAlert,
      href: '/admin/fichas',
      color: 'text-oro',
      bgColor: 'bg-oro/10',
      borderColor: 'hover:border-oro/50'
    }
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-[1750px]">
        <header className="mb-6 ninja-card-oro p-10 xl:p-16 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-oro/5 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none" />

          <div className="flex items-center gap-4 mb-8">
            <div className="w-8 h-px bg-oro/30" />
            <h1 className="text-oro/40 font-black uppercase tracking-[0.5em] text-[10px] xl:text-xs">CENTRO DE MANDO SUPREMO</h1>
          </div>
          <h2 className="ninja-title text-6xl xl:text-8xl mb-8">ADMINISTRACIÓN</h2>
          <p className="text-gris-texto/60 text-lg xl:text-xl max-w-4xl leading-relaxed italic border-l-2 border-oro/10 pl-10 py-2">
            Control total del motor NRPG. Gestiona el equilibrio del mundo, las técnicas sagradas y el destino de los shinobis.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8">
          {modules.map((mod) => (
            <Link
              key={mod.href}
              href={mod.href}
              className="group relative p-10 ninja-card-oro hover:scale-[1.02] transition-all duration-500 flex flex-col justify-between"
            >
              {/* Sutil Glow de fondo */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-oro/[0.02] rounded-full blur-3xl group-hover:bg-oro/[0.05] transition-all" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-12">
                  <div className="w-10 h-10 bg-oro/[0.03] border border-oro/5 flex items-center justify-center group-hover:bg-oro group-hover:text-black transition-all duration-500">
                    <mod.icon className="w-5 h-5 text-oro/40 group-hover:text-inherit" />
                  </div>
                  <div className="text-[10px] font-black text-oro/20 uppercase tracking-[0.3em] group-hover:text-oro/40 transition-colors">CONFIG</div>
                </div>

                <h3 className="text-2xl xl:text-3xl font-black text-oro uppercase tracking-widest mb-4 group-hover:translate-x-1 transition-transform">{mod.title}</h3>
                <p className="text-gris-texto/40 text-sm xl:text-base leading-relaxed mb-10 max-w-[250px]">{mod.desc}</p>
              </div>

              <div className="flex items-center gap-4 text-[10px] font-black text-oro/20 uppercase tracking-[0.3em] group-hover:text-oro transition-all mt-auto pt-6 border-t border-oro/[0.02]">
                <span>ACCEDER AL MÓDULO</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
