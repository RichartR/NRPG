import Link from 'next/link';
import { Settings, BookOpen, Map, GitBranch, Sword, LayoutDashboard, ChevronRight, Globe } from 'lucide-react';

export default function AdminPage() {
  const modules = [
    {
      title: 'Sistemas Técnicos',
      desc: 'Manuales, reglas base y sistemas generales del RPG.',
      icon: Settings,
      href: '/admin/sistemas',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'hover:border-blue-500/50'
    },
    {
      title: 'Aldeas y Lore',
      desc: 'Gestionar las 5 grandes naciones, sus banners e imágenes.',
      icon: Map,
      href: '/admin/aldeas',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'hover:border-emerald-500/50'
    },
    {
      title: 'Ramas y Clanes',
      desc: 'Crear especialidades y vincular clanes a sus aldeas.',
      icon: GitBranch,
      href: '/admin/ramas',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'hover:border-amber-500/50'
    },
    {
      title: 'Biblioteca de Combate',
      desc: 'Gestionar técnicas, jutsus y habilidades de combate.',
      icon: Sword,
      href: '/admin/combate',
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'hover:border-red-500/50'
    },
    {
      title: 'Mundo Ninja',
      desc: 'Directorio de shinobis agrupados por aldeas y naciones.',
      icon: Globe,
      href: '/admin/mundo-ninja',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'hover:border-purple-500/50'
    },
    {
      title: 'Registro Maestro',
      desc: 'Control central de técnicas, objetos y pasivas del juego.',
      icon: BookOpen,
      href: '/admin/glosario',
      color: 'text-teal-400',
      bgColor: 'bg-teal-400/10',
      borderColor: 'hover:border-teal-400/50'
    },
    {
      title: 'Variables de Sistema',
      desc: 'Configurar escalados, reglas de rango y constantes globales.',
      icon: Settings,
      href: '/admin/config',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'hover:border-emerald-500/50'
    }
  ];

  return (
    <div className="min-h-screen bg-black pt-24 pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <LayoutDashboard className="w-6 h-6 text-zinc-500" />
            <h1 className="text-zinc-500 font-black uppercase tracking-[0.3em] text-xs">Panel de Control</h1>
          </div>
          <h2 className="text-5xl md:text-6xl font-black text-white tracking-tighter uppercase italic">ADMINISTRACIÓN</h2>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {modules.map((mod) => (
            <Link 
              key={mod.href}
              href={mod.href}
              className={`group relative p-10 bg-zinc-900 border border-zinc-800 rounded-[2.5rem] transition-all overflow-hidden ${mod.borderColor}`}
            >
              <div className={`absolute -bottom-4 -right-4 opacity-10 group-hover:scale-110 transition-transform ${mod.color}`}>
                <mod.icon className="w-40 h-40" />
              </div>
              
              <div className="relative z-10">
                <div className={`w-14 h-14 rounded-2xl ${mod.bgColor} flex items-center justify-center mb-8 border border-white/5`}>
                  <mod.icon className={`w-6 h-6 ${mod.color}`} />
                </div>
                <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">{mod.title}</h3>
                <p className="text-zinc-500 text-sm mb-8 max-w-xs">{mod.desc}</p>
                <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${mod.color} group-hover:translate-x-2 transition-transform`}>
                  Gestionar módulo <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
