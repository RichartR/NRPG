import { createClient } from '@/utils/supabase/server';
import { Globe, Users } from 'lucide-react';
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

export default async function MundoNinjaSelectionPage() {
  const supabase = await createClient();

  const aldeas = await MasterServerService.getAldeasActivas(supabase);

  const [countsMap, maxCuposRaw] = await Promise.all([
    MasterServerService.getCharacterCountsByAldea(supabase, aldeas.map((a) => a.id)),
    MasterServerService.getConfiguracion(supabase, 'cupos_maximos_aldea'),
  ]);

  const maxCupos =
    maxCuposRaw != null && maxCuposRaw !== ''
      ? Number(maxCuposRaw)
      : 30;

  const getCount = (id: number | null) => {
    return id ? countsMap[id] || 0 : countsMap['renegados'] || 0;
  };

  return (
    <div className="pt-24 pb-20 px-4 sm:p-8 xl:p-12 flex flex-col min-h-screen">
      <header className="w-full max-w-[1750px] mx-auto flex flex-col md:flex-row justify-between items-center gap-10 mb-10 ninja-card-oro p-8 xl:p-10 z-50">
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Mundo Ninja' },
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
        <div className="mb-20 ninja-card-oro p-8 sm:p-12 xl:p-16 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
            <Globe className="w-64 h-64 rotate-12" />
          </div>
          <div className="flex items-center gap-6 mb-6 relative z-10">
            <h1 className="ninja-title text-3xl sm:text-5xl xl:text-8xl uppercase leading-none">
              Shinobis de las Naciones
            </h1>
          </div>
          <p className="text-gris-texto text-base sm:text-lg xl:text-2xl max-w-4xl leading-relaxed relative z-10">
            Explora el censo oficial de las Grandes Naciones Shinobi. Descubre a los guerreros que
            forjan la historia y el destino de cada aldea oculta.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 xl:gap-16">
          {aldeas?.map((aldea) => {
            const actuales = getCount(aldea.id);
            const aldeaTitle = aldea.abreviatura || aldea.nombre_jap;
            return (
              <NinjaCard
                key={aldea.id}
                href={`/mundo-ninja/${aldea.id}`}
                title={aldeaTitle}
                titleClassName={getTitleFontSize(aldeaTitle)}
                category={aldea.nombre_español}
                categoryClassName="text-[10px] sm:text-xs md:text-sm lg:text-base xl:text-lg font-black text-oro/40 uppercase tracking-[0.2em] sm:tracking-[0.4em] break-words"
                imageUrl={aldea.url_imagen || undefined}
                description={aldea.descripcion || 'Sin descripción registrada.'}
                actionText="Ver censo"
                headerOverlayRight={
                  <div className="flex flex-col items-start sm:items-end gap-0.5 shrink-0">
                    <span className="text-2xl md:text-3xl xl:text-4xl font-black text-oro tabular-nums leading-none">
                      {actuales}/{maxCupos}
                    </span>
                    <span className="text-[10px] md:text-xs xl:text-sm font-black text-oro/20 uppercase tracking-widest">
                      SHINOBIS
                    </span>
                  </div>
                }
              />
            );
          })}

          {/* Sin Aldea / Renegados */}
          <NinjaCard
            href="/mundo-ninja/renegados"
            className="md:col-span-2 xl:col-span-1"
            title="RENEGADOS"
            titleClassName={getTitleFontSize('RENEGADOS')}
            category="Shinobis sin afiliación"
            categoryClassName="text-[10px] sm:text-xs md:text-sm lg:text-base xl:text-lg font-black text-oro/40 uppercase tracking-[0.2em] sm:tracking-[0.4em] break-words"
            imageUrl="/assets/images/renegados.jpg"
            description="Guerreros sin aldea oculta, exiliados o ronin que operan fuera del control de las grandes naciones."
            actionText="Ver censo"
            headerBgIcon={
              <div className="absolute top-6 right-6 opacity-[0.06] group-hover:opacity-[0.12] transition-opacity pointer-events-none">
                <Users className="w-32 h-32 text-oro rotate-12" />
              </div>
            }
            headerOverlayRight={
              <div className="flex flex-col items-start sm:items-end gap-0.5 shrink-0">
                <span className="text-2xl md:text-3xl xl:text-4xl font-black text-oro tabular-nums leading-none">
                  {getCount(null)}
                </span>
                <span className="text-[10px] md:text-xs xl:text-sm font-black text-oro/20 uppercase tracking-widest">
                  SHINOBIS
                </span>
              </div>
            }
          />
        </div>
      </main>
    </div>
  );
}
