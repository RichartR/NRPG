import { createClient } from '@/utils/supabase/server';
import { MasterServerService } from '@/services/supabase/master.server.service';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import NinjaCard from '@/components/ui/NinjaCard';

function getTitleFontSize(name: string) {
  const len = name.length;
  if (len <= 4) {
    return "text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-5xl 2xl:text-6xl";
  }
  if (len <= 7) {
    return "text-2xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-4xl 2xl:text-5xl";
  }
  return "text-xl sm:text-2xl md:text-3xl lg:text-3xl xl:text-3xl 2xl:text-4xl";
}

export default async function AldeasPage() {
  const aldeas = await MasterServerService.getCachedAldeasActivas();

  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-12 flex flex-col">
      <header className="w-full max-w-[1750px] mx-auto flex flex-col md:flex-row justify-between items-center gap-10 mb-10 ninja-card-oro p-8 xl:p-10 z-50">
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Biblioteca', href: '/documentos' },
            { label: 'Aldeas y Organizaciones' }
          ]}
        />
        <div className="flex items-center gap-4">
          <img src="/assets/icons/shuriken.png" className="w-5 xl:w-7 h-auto object-contain" alt="icon" />
          <h1 className="text-xl xl:text-2xl font-black text-oro uppercase tracking-[0.3em]">
            Naciones <span className="text-oro/40">Ocultas</span>
          </h1>
        </div>
      </header>

      <main className="w-full max-w-[1750px] mx-auto flex-1">
        <div className="mb-10 ninja-card-oro p-12 xl:p-16">
          <div className="flex items-center gap-6 mb-6">
            <h1 className="ninja-title text-5xl xl:text-7xl uppercase leading-none">Aldeas y Organizaciones</h1>
          </div>
          <p className="text-gris-texto text-lg xl:text-2xl leading-relaxed">
            Las grandes potencias que mantienen el equilibrio del poder shinobi. Cada aldea posee su propia historia, clanes legendarios y geografía sagrada.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 xl:gap-16">
          {aldeas.map((aldea) => (
            <NinjaCard
              key={aldea.id}
              href={`/aldeas/${aldea.slug}`}
              title={aldea.abreviatura || aldea.nombre_jap}
              titleClassName={getTitleFontSize(aldea.abreviatura || aldea.nombre_jap)}
              category={aldea.nombre_español}
              categoryClassName="text-caption sm:text-xs md:text-sm lg:text-base xl:text-lg tracking-[0.2em] sm:tracking-[0.4em]"
              imageUrl={aldea.url_imagen}
              description={aldea.descripcion}
              actionText="Ver Información"
            />
          ))}

          {/* Sin Aldea / Renegados */}
          <NinjaCard
            href="/mundo-ninja/renegados"
            title="RENEGADOS"
            titleClassName={getTitleFontSize('RENEGADOS')}
            category="Shinobis sin afiliación"
            categoryClassName="text-caption sm:text-xs md:text-sm lg:text-base xl:text-lg tracking-[0.2em] sm:tracking-[0.4em]"
            imageUrl="/assets/images/renegados.jpg"
            description="Guerreros sin aldea oculta, exiliados o ronin que operan fuera del control de las grandes naciones."
            actionText="Ver Información"
          />
        </div>
      </main>
    </div>
  );
}
