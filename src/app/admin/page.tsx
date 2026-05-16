import Link from 'next/link';
import { Settings, BookOpen, Map, GitBranch, Sword, LayoutDashboard, ChevronRight, Globe, ScrollText, ShieldAlert } from 'lucide-react';

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
    }
  ];

  return (
    <div className="min-h-screen bg-black pt-32 pb-20 px-8 sm:px-12 xl:px-20">
      <div className="max-w-[1750px] mx-auto">
        <header className="mb-20 bg-black/60 p-12 xl:p-16 ninja-box ninja-border backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-oro/5 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none" />
          <div className="flex items-center gap-6 mb-8">
            <img src="/assets/icons/shuriken.png" className="w-5 xl:w-8 h-auto object-contain" alt="icon" />
            <h1 className="text-oro/40 font-black uppercase tracking-[0.4em] text-xs xl:text-sm">CENTRO DE MANDO SUPREMO</h1>
          </div>
          <h2 className="ninja-title text-6xl xl:text-8xl">PANEL DE CONTROL</h2>
          <p className="text-gris-texto text-lg xl:text-2xl mt-6 max-w-3xl leading-relaxed">Administración central del motor NRPG. Gestiona el equilibrio del mundo, las técnicas sagradas y el destino de los shinobis.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 xl:gap-12">
          {modules.map((mod) => (
            <Link 
              key={mod.href}
              href={mod.href}
              className="group relative p-12 bg-black/60 backdrop-blur-md ninja-box ninja-border hover-ninja flex flex-col justify-between overflow-hidden transition-all"
            >
              <div className="absolute -bottom-8 -right-8 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all text-oro">
                <mod.icon className="w-48 h-48" />
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-1.5 h-1.5 bg-rojo-sangre rotate-45" />
                  <h3 className="text-2xl xl:text-4xl font-black text-oro uppercase tracking-widest">{mod.title}</h3>
                </div>
                
                <p className="text-gris-texto/80 text-base xl:text-xl leading-relaxed mb-12 max-w-xs">{mod.desc}</p>
                
                <div className="mt-auto flex items-center gap-4 text-oro font-black uppercase tracking-[0.2em] text-xs xl:text-sm group-hover:brightness-125 transition-all">
                  <span>Abrir Configuración</span>
                  <div className="w-1.5 h-1.5 bg-oro rotate-45 group-hover:translate-x-2 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
