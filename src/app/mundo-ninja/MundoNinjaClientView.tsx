'use client';

import { useState } from 'react';
import { Users } from 'lucide-react';
import NinjaCard from '@/components/ui/NinjaCard';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import AdminViewSelector from '@/components/admin/AdminViewSelector';
import AldeaList from '@/components/admin/AldeaList';

interface MundoNinjaClientViewProps {
  aldeas: any[];
  countsMap: Record<string, number>;
  maxCupos: number;
  isAdmin: boolean;
  adminAldeas: any[];
}

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

export default function MundoNinjaClientView({
  aldeas,
  countsMap,
  maxCupos,
  isAdmin,
  adminAldeas,
}: MundoNinjaClientViewProps) {
  const [viewMode, setViewMode] = useState<'player' | 'admin'>('player');

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
            INFORMACIÓN <span className="text-oro/40">NINJA</span>
          </h1>
        </div>
      </header>

      {/* Selector de Modo Reutilizable (Exclusivo para Admins) */}
      <AdminViewSelector
        isAdmin={isAdmin}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        title="Panel de Control de Aldeas y Organizaciones"
      />

      <main className="w-full max-w-[1750px] mx-auto flex-1">
        {viewMode === 'player' ? (
          <>
            <div className="mb-10 ninja-card-oro p-8 sm:p-12 xl:p-16 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
              </div>
              <div className="flex items-center gap-6 mb-3 relative z-10">
                <h1 className="ninja-title text-3xl sm:text-5xl xl:text-7xl uppercase leading-none">
                  Fichas Ninja
                </h1>
              </div>
              <p className="text-gris-texto text-base sm:text-lg xl:text-2xl leading-relaxed relative z-10">
                Explora el censo oficial de las Naciones y Organizaciones Shinobi. Descubre a los guerreros que
                forjan la historia y el destino de cada aldea oculta.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 xl:gap-10">
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
                    categoryClassName="text-caption sm:text-xs md:text-sm lg:text-base xl:text-lg font-black text-oro/40 uppercase tracking-[0.2em] sm:tracking-[0.4em] break-words"
                    imageUrl={aldea.url_imagen || undefined}
                    description={aldea.descripcion || 'Sin descripción registrada.'}
                    actionText="Ver información"
                    headerOverlayRight={
                      <div className="flex flex-col items-start sm:items-end gap-0.5 shrink-0">
                        <span className="text-2xl md:text-3xl xl:text-4xl font-black text-oro tabular-nums leading-none">
                          {actuales}/{maxCupos}
                        </span>
                        <span className="text-caption md:text-xs xl:text-sm font-black text-oro/20 uppercase tracking-widest">
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
                categoryClassName="text-caption sm:text-xs md:text-sm lg:text-base xl:text-lg font-black text-oro/40 uppercase tracking-[0.2em] sm:tracking-[0.4em] break-words"
                imageUrl="/assets/images/renegados.jpg"
                description="Ninjas sin afiliación o exiliados que actuan fuera del control de las grandes naciones."
                actionText="Ver información"
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
                    <span className="text-caption md:text-xs xl:text-sm font-black text-oro/20 uppercase tracking-widest">
                      SHINOBIS
                    </span>
                  </div>
                }
              />
            </div>
          </>
        ) : (
          <div className="animate-in fade-in duration-500">
            <header className="mb-6 ninja-card-oro p-8 xl:p-10">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-oro/[0.03] border border-oro/10 flex items-center justify-center">
                  <img src="/assets/icons/shuriken.png" className="w-4 xl:w-6 h-auto" alt="icon" />
                </div>
                <div>
                  <h1 className="ninja-title text-4xl xl:text-5xl italic">Gestión de Aldeas y Organizaciones</h1>
                  <p className="text-oro/40 text-caption xl:text-xs font-black uppercase tracking-[0.4em] mt-2">Crea, oculta o elimina aldeas y organizaciones.</p>
                </div>
              </div>
            </header>

            <AldeaList initialAldeas={adminAldeas} />
          </div>
        )}
      </main>
    </div>
  );
}
