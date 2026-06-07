'use client';

import { useState } from 'react';
import NinjaCard from '@/components/ui/NinjaCard';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import DocList from '@/components/admin/DocList';
import AdminViewSelector from '@/components/admin/AdminViewSelector';

interface SistemasClientViewProps {
  initialDocs: any[];
  isAdmin: boolean;
  adminDocs: any[];
  adminCategories: any[];
}

export default function SistemasClientView({
  initialDocs,
  isAdmin,
  adminDocs,
  adminCategories,
}: SistemasClientViewProps) {
  const [viewMode, setViewMode] = useState<'player' | 'admin'>('player');

  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-12 flex flex-col animate-in fade-in duration-500">
      {/* Cabecera Principal */}
      <header className="w-full max-w-[1750px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 mb-8 ninja-card-oro p-6 sm:p-8 xl:p-10 z-50">
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Sistemas' }
          ]}
        />
        <div className="flex items-center gap-4">
          <img src="/assets/icons/shuriken.png" className="w-4 xl:w-6 h-auto" alt="icon" />
          <h1 className="text-lg xl:text-2xl font-black text-oro uppercase tracking-[0.3em] pt-1">
            Sistemas <span className="text-oro/40">de NRPG</span>
          </h1>
        </div>
      </header>

      {/* Selector de Modo Reutilizable (Exclusivo para Admins) */}
      <AdminViewSelector
        isAdmin={isAdmin}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Contenido Principal */}
      <main className="w-full max-w-[1750px] mx-auto flex-1">
        {viewMode === 'player' ? (
          <>
            <div className="mb-10 ninja-card-oro p-8 sm:p-12 xl:p-16">
              <div className="flex items-center gap-6 mb-6">
                <h1 className="ninja-title text-3xl sm:text-5xl xl:text-7xl">SISTEMAS</h1>
              </div>
              <p className="text-gris-texto text-base sm:text-lg xl:text-2xl leading-relaxed">Consulta las mecánicas detalladas, tablas de escalado y reglas de combate fundamentales para el desarrollo del rol.</p>
            </div>

            {initialDocs.length === 0 && (
              <div className="text-center py-32 ninja-card-oro opacity-50">
                <p className="text-oro/40 font-black uppercase tracking-[0.3em] text-xl">No hay sistemas registrados todavía.</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 xl:gap-16">
              {initialDocs.map((doc) => (
                <NinjaCard
                  key={doc.id}
                  href={`/docs/${doc.clave}`}
                  title={doc.titulo}
                  titleClassName="text-2xl sm:text-3xl md:text-2xl"
                  category="SISTEMA"
                  imageUrl={doc.url_imagen}
                  description={doc.descripcion}
                  actionText="Ver Sistema"
                />
              ))}
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
                  <h1 className="ninja-title text-4xl xl:text-5xl italic">REGLAS DE SISTEMA</h1>
                  <p className="text-oro/40 text-caption xl:text-xs font-black uppercase tracking-[0.4em] mt-2">CONFIGURACIÓN DE MECÁNICAS Y MANUALES</p>
                </div>
              </div>
            </header>

            <DocList
              initialDocs={adminDocs}
              categories={adminCategories}
              defaultCategory="sistemas"
              showSubcategory={false}
            />
          </div>
        )}
      </main>
    </div>
  );
}
