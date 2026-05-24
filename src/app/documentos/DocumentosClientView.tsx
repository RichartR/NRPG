'use client';

import { useState } from 'react';
import NinjaCard from '@/components/ui/NinjaCard';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import AdminViewSelector from '@/components/admin/AdminViewSelector';
import RamaManager from '@/components/admin/RamaManager';

interface DocumentosClientViewProps {
  isAdmin: boolean;
  adminRamas: any[];
  adminAldeas: any[];
  adminSubs: any[];
  adminEntrenamientos: any[];
}

export default function DocumentosClientView({
  isAdmin,
  adminRamas,
  adminAldeas,
  adminSubs,
  adminEntrenamientos,
}: DocumentosClientViewProps) {
  const [viewMode, setViewMode] = useState<'player' | 'admin'>('player');

  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-12 flex flex-col">
      {/* Header idéntico a Registros */}
      <header className="w-full max-w-[1750px] mx-auto flex flex-col md:flex-row justify-between items-center gap-10 mb-10 ninja-card-oro p-8 xl:p-10 z-50">
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Biblioteca' }
          ]}
        />
        <div className="flex items-center gap-4">
          <img src="/assets/icons/shuriken.png" className="w-4 xl:w-6 h-auto" alt="icon" />
          <h1 className="text-xl xl:text-2xl font-black text-oro uppercase tracking-[0.3em]">
            Biblioteca <span className="text-oro/40">Mundial</span>
          </h1>
        </div>
      </header>

      {/* Selector de Modo Reutilizable (Exclusivo para Admins) */}
      <AdminViewSelector
        isAdmin={isAdmin}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        title="Panel de Control de Ramas y Clanes"
      />

      <main className="w-full max-w-[1750px] mx-auto flex-1">
        {viewMode === 'player' ? (
          <>
            {/* Hero Section idéntico a Registros */}
            <div className="mb-10 ninja-card-oro p-8 sm:p-12 xl:p-16">
              <div className="flex items-center gap-6 mb-6">
                <h1 className="ninja-title text-3xl sm:text-5xl xl:text-8xl uppercase leading-none">Biblioteca Ninja</h1>
              </div>
              <p className="text-gris-texto text-base sm:text-lg xl:text-2xl max-w-4xl leading-relaxed">
                Toda la sabiduría del Mundo Ninja concentrada en un solo lugar. Geografía, clanes y las artes de combate.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 xl:gap-10 max-w-[1750px]">
              {/* Tarjeta Aldeas */}
              <NinjaCard
                href="/aldeas"
                title="ALDEAS"
                titleClassName="text-3xl sm:text-4xl md:text-5xl"
                category="BIBLIOTECA"
                imageUrl="https://game.gtimg.cn/images/hyrz/web2026/match.jpg"
                description="Descubre los secretos de aldeas y organizaciones: su historia, clanes fundadores y geografía sagrada."
                actionText="Explorar Mundo"
              />

              {/* Tarjeta Ramas */}
              <NinjaCard
                href="/ramas"
                title="RAMAS"
                titleClassName="text-3xl sm:text-4xl md:text-5xl"
                category="ESPECIALIDAD"
                imageUrl="https://game.gtimg.cn/images/hyrz/web2026/ninja.jpg"
                description="Especialidades de combate, el despertar de clanes y el funcionamiento de las artes ninja prohibidas."
                actionText="Ver Especialidades"
              />

              {/* Tarjeta Glosario */}
              <NinjaCard
                href="/glosario"
                title="GLOSARIO"
                titleClassName="text-3xl sm:text-4xl md:text-5xl"
                category="GLOSARIO"
                imageUrl="/assets/images/glosario.jpg"
                description="Consulta el glosario con todo el conocimiento del mundo shinobi."
                actionText="Consultar Glosario"
              />
            </div>
          </>
        ) : (
          <div className="animate-in fade-in duration-500">
            <RamaManager
              initialRamas={adminRamas}
              aldeas={adminAldeas}
              initialSubs={adminSubs}
              initialEntrenamientos={adminEntrenamientos}
            />
          </div>
        )}
      </main>
    </div>
  );
}
