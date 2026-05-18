import { createClient } from '@/utils/supabase/server';
import { MapPin, ChevronLeft, Globe, Users } from 'lucide-react';
import Link from 'next/link';
import { MasterServerService } from '@/services/supabase/master.server.service';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

export default async function MundoNinjaSelectionPage() {
  const supabase = await createClient();
  
  const aldeas = await MasterServerService.getAldeasActivas(supabase);
  const countsMap = await MasterServerService.getCharacterCountsByAldea(supabase, aldeas.map(a => a.id));

  const getCount = (id: number | null) => {
    return id ? (countsMap[id] || 0) : (countsMap['renegados'] || 0);
  };

  return (
    <div className="pt-24 pb-20 px-4 flex flex-col">
      <header className="w-full max-w-[1750px] mx-auto flex flex-col md:flex-row justify-between items-center gap-10 mb-16 ninja-card-oro p-8 xl:p-12 z-50">
        <Breadcrumbs 
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Mundo Ninja' }
          ]} 
        />
        <div className="flex items-center gap-4">
          <img src="/assets/icons/shuriken.png" className="w-4 xl:w-6 h-auto" alt="icon" />
          <h1 className="text-xl xl:text-2xl font-black text-oro uppercase tracking-[0.3em]">
            REGISTROS <span className="text-oro/40">MUNDIALES</span>
          </h1>
        </div>
      </header>

      <main className="w-full max-w-[1750px] mx-auto flex-1">
        <div className="mb-20 ninja-card-oro p-12 xl:p-16 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
             <Globe className="w-64 h-64 rotate-12" />
          </div>
          <div className="flex items-center gap-6 mb-8 relative z-10">
            <h1 className="ninja-title text-5xl xl:text-8xl">Shinobis de las Naciones</h1>
          </div>
          <p className="text-gris-texto text-lg xl:text-2xl max-w-4xl leading-relaxed relative z-10">
            Explora el censo oficial de las Grandes Naciones Shinobi. Descubre a los guerreros que forjan la historia y el destino de cada aldea oculta.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 xl:gap-16">
          {aldeas?.map((aldea) => (
            <Link 
              key={aldea.id}
              href={`/mundo-ninja/${aldea.id}`}
              className="group relative ninja-card-oro p-10 xl:p-16 hover-ninja transition-all overflow-hidden flex items-center justify-between"
            >
              <div className="relative z-10 flex items-center gap-10">
                <div className="w-24 xl:w-32 h-24 xl:h-32 bg-black/40 border border-oro/10 p-6 flex items-center justify-center shrink-0 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                  {aldea.url_icono ? (
                    <img src={aldea.url_icono} alt="" className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(255,215,0,0.3)]" />
                  ) : (
                    <div className="w-4 h-4 bg-oro/20 rotate-45" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-6 mb-3">
                    <h3 className="text-4xl xl:text-6xl font-black text-oro uppercase tracking-tight group-hover:text-white transition-colors">{aldea.nombre_jap}</h3>
                    <span className="px-4 py-1.5 bg-rojo-sangre text-oro text-[10px] xl:text-xs font-black border border-oro/20 uppercase tracking-widest ninja-clip-xs">{aldea.abreviatura}</span>
                  </div>
                  <p className="text-oro/40 text-sm xl:text-xl font-black uppercase tracking-[0.3em] group-hover:text-oro/60 transition-colors">{aldea.nombre_español}</p>
                </div>
              </div>

              <div className="relative z-10 flex flex-col items-end">
                <span className="text-5xl xl:text-7xl font-black text-oro group-hover:scale-110 transition-transform duration-500 leading-none mb-2">{getCount(aldea.id)}</span>
                <span className="text-[10px] xl:text-xs font-black text-oro/20 uppercase tracking-[0.4em] group-hover:text-oro/40 transition-colors">SHINOBIS</span>
              </div>

              {aldea.url_imagen && (
                <div className="absolute inset-0 z-0 opacity-[0.05] group-hover:opacity-[0.15] transition-all duration-700 pointer-events-none scale-100 group-hover:scale-110">
                  <img src={aldea.url_imagen} alt="" className="w-full h-full object-cover grayscale brightness-50" />
                </div>
              )}
            </Link>
          ))}

          {/* Sin Aldea / Renegados */}
          <Link 
            href="/mundo-ninja/renegados"
            className="group relative ninja-card-rojo p-10 xl:p-16 hover-ninja transition-all overflow-hidden md:col-span-2 flex items-center justify-between"
          >
            <div className="relative z-10 flex items-center gap-10">
              <div className="w-24 xl:w-32 h-24 xl:h-32 bg-rojo-sangre/10 border border-rojo-sangre/20 p-8 flex items-center justify-center shrink-0 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                <div className="w-10 xl:w-12 h-10 xl:h-12 bg-rojo-sangre rotate-45 shadow-[0_0_20px_rgba(103,9,9,0.5)]" />
              </div>
              <div>
                <h3 className="text-4xl xl:text-6xl font-black text-oro uppercase tracking-tight group-hover:text-rojo-sangre transition-colors mb-2">RENEGADOS</h3>
                <p className="text-oro/40 text-sm xl:text-xl font-black uppercase tracking-[0.3em] group-hover:text-oro/60 transition-colors">Shinobis sin afiliación o exiliados.</p>
              </div>
            </div>

            <div className="relative z-10 flex flex-col items-end">
              <span className="text-5xl xl:text-7xl font-black text-rojo-sangre group-hover:scale-110 transition-transform duration-500 leading-none mb-2">{getCount(null)}</span>
              <span className="text-[10px] xl:text-xs font-black text-oro/20 uppercase tracking-[0.4em] group-hover:text-oro/40 transition-colors">SHINOBIS</span>
            </div>
            
            <div className="absolute -right-20 -bottom-20 opacity-[0.02] group-hover:opacity-[0.08] transition-all duration-700 pointer-events-none">
               <Users className="w-96 h-96 rotate-12 text-rojo-sangre" />
            </div>
          </Link>
        </div>
      </main>
    </div>

  );
}
