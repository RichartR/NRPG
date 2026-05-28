'use client';

import { useState } from 'react';
import { Zap } from 'lucide-react';
import NewsGrid from './NewsGrid';
import NewsList from '@/components/admin/NewsList';
import AdminViewSelector from '@/components/admin/AdminViewSelector';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

interface NoticiasClientViewProps {
  newsList: any[];
  isAdmin: boolean;
  adminNews: any[];
}

export default function NoticiasClientView({
  newsList,
  isAdmin,
  adminNews,
}: NoticiasClientViewProps) {
  const [viewMode, setViewMode] = useState<'player' | 'admin'>('player');

  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-12 flex flex-col animate-in fade-in duration-500">
      {/* Cabecera Principal */}
      <header className="w-full max-w-[1750px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 mb-10 ninja-card-oro p-6 sm:p-8 xl:p-10 relative z-50">
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Noticias' }
          ]}
        />
        <div className="flex items-center gap-4">
          <img src="/assets/icons/shuriken.png" className="w-4 xl:w-6 h-auto" alt="icon" />
          <h1 className="text-lg xl:text-2xl font-black text-oro uppercase tracking-[0.3em] pt-1">
            Muro de Anuncios
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
                <h1 className="ninja-title text-3xl sm:text-5xl xl:text-8xl">NOTICIAS Y EVENTOS</h1>
              </div>
              <p className="text-gris-texto text-base sm:text-lg xl:text-2xl max-w-4xl leading-relaxed">Mantente al día con las últimas actualizaciones del servidor, eventos de rol y parches de equilibrio.</p>
            </div>

            <NewsGrid newsList={newsList} isAdmin={isAdmin} />
          </>
        ) : (
          <div className="animate-in fade-in duration-500">
            <header className="mb-6 ninja-card-oro p-8 xl:p-10">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-oro/[0.03] border border-oro/10 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-oro" />
                </div>
                <div>
                  <h1 className="ninja-title text-4xl xl:text-5xl italic">REGLAS DE NOTICIAS</h1>
                  <p className="text-oro/40 text-[10px] xl:text-xs font-black uppercase tracking-[0.4em] mt-2">CONFIGURACIÓN DE ANUNCIOS Y COMUNICADOS</p>
                </div>
              </div>
            </header>

            <NewsList initialDocs={adminNews} />
          </div>
        )}
      </main>
    </div>
  );
}
