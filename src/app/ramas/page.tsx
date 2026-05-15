import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { GitBranch, ChevronRight, ChevronLeft } from 'lucide-react';
import { MasterServerService } from '@/services/supabase/master.server.service';

export default async function RamasPage() {
  const supabase = await createClient();
  const ramas = await MasterServerService.getRamasGlobales(supabase);

  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-12 flex flex-col">
      <header className="w-full max-w-[1750px] mx-auto flex flex-col md:flex-row justify-between items-center gap-10 mb-10 ninja-card-oro p-8 xl:p-10 z-50">
        <Link href="/documentos" className="flex items-center gap-4 text-oro hover:brightness-125 transition-all group font-black uppercase tracking-widest text-sm xl:text-lg">
          <div className="w-2 xl:w-3 h-2 xl:h-3 bg-rojo-sangre rotate-45 group-hover:bg-oro transition-colors" />
          Volver a Biblioteca
        </Link>
        <div className="flex items-center gap-4">
          <GitBranch className="w-5 xl:w-7 h-auto text-oro" />
          <h1 className="text-xl xl:text-2xl font-black text-oro uppercase tracking-[0.3em]">
            Especialidades <span className="text-oro/40">Ninja</span>
          </h1>
        </div>
      </header>

      <main className="w-full max-w-[1750px] mx-auto flex-1">
        <div className="mb-20 ninja-card-oro p-12 xl:p-16">
          <div className="flex items-center gap-6 mb-6">
            <h1 className="ninja-title text-5xl xl:text-8xl uppercase leading-none">Ramas de Combate</h1>
          </div>
          <p className="text-gris-texto text-lg xl:text-2xl max-w-4xl leading-relaxed">
            Las disciplinas fundamentales que definen el camino de cada shinobi. Especialidades, artes secretas y clanes milenarios.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 xl:gap-16">
          {ramas?.map((rama) => (
            <Link 
              key={rama.id} 
              href={`/ramas/${rama.slug}`}
              className="group relative overflow-hidden ninja-card-oro p-10 xl:p-16 hover-ninja flex flex-col justify-between min-h-[400px] xl:min-h-[450px]"
            >
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                  <h3 className="ninja-title text-3xl xl:text-5xl group-hover:text-oro transition-all leading-none">{rama.nombre}</h3>
                </div>
                <p className="text-gris-texto/80 text-lg xl:text-2xl leading-relaxed max-w-sm mb-12 italic">
                   "{rama.descripcion}"
                </p>
              </div>

              <div className="flex items-center gap-4 text-oro font-black uppercase tracking-[0.2em] text-xs xl:text-base group-hover:brightness-125 transition-all relative z-10">
                <span>Dominar Rama</span>
                <div className="w-1.5 h-1.5 bg-oro rotate-45 group-hover:translate-x-2 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
