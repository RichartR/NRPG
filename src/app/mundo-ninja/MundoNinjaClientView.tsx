'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import NinjaCard from '@/components/ui/NinjaCard';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import AdminViewSelector from '@/components/admin/AdminViewSelector';
import AldeaList from '@/components/admin/AldeaList';
import { AdminService } from '@/services/supabase/admin.service';
import { useToastStore } from '@/components/ui/Toast';
import { useUserRoles } from '@/hooks/useUserRoles';
import { MasterService } from '@/services/supabase/master.service';

interface MundoNinjaClientViewProps {
  aldeas: any[];
  countsMap: Record<string, number>;
  maxCupos: number;
  isAdmin?: boolean;
  adminAldeas?: any[];
  initialConfigReseteo?: any;
}

function getTitleFontSize(name: string = '') {
  return "text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-5xl";
}

export default function MundoNinjaClientView({
  aldeas,
  countsMap,
  maxCupos,
  isAdmin: initialIsAdmin = false,
  adminAldeas: initialAdminAldeas = [],
  initialConfigReseteo,
}: MundoNinjaClientViewProps) {
  const { roles } = useUserRoles();
  const isAdmin = initialIsAdmin || roles.includes('admin');
  const [adminAldeas, setAdminAldeas] = useState(initialAdminAldeas);
  const [viewMode, setViewMode] = useState<'player' | 'admin'>('player');
  const [configReseteo, setConfigReseteo] = useState<any>(initialConfigReseteo);
  const [updatingReseteo, setUpdatingReseteo] = useState(false);
  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    if (!isAdmin || adminAldeas.length > 0) return;
    Promise.all([
      MasterService.getAldeas(),
      AdminService.getConfigByClave('periodo_reseteos_gratuitos'),
    ]).then(([aldeasData, reseteoData]) => {
      setAdminAldeas(aldeasData);
      setConfigReseteo(reseteoData);
    }).catch((error) => console.error('Error cargando la administración de aldeas:', error));
  }, [isAdmin, adminAldeas.length]);

  const configReseteoValue = configReseteo?.valor === true || String(configReseteo?.valor) === 'true';

  const handleToggleReseteos = async () => {
    if (!configReseteo) return;
    setUpdatingReseteo(true);
    try {
      const newValue = !configReseteoValue;
      const updated = await AdminService.updateConfig(configReseteo.id, newValue);
      setConfigReseteo(updated);
      addToast(
        newValue
          ? 'Periodo de reseteos gratuitos ACTIVADO con éxito.'
          : 'Periodo de reseteos gratuitos DESACTIVADO (reseteos con coste del 25%).',
        'success'
      );
    } catch (err: any) {
      addToast(err.message || 'Error al actualizar la configuración', 'error');
    } finally {
      setUpdatingReseteo(false);
    }
  };

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
          <img src="/assets/icons/shuriken.webp" className="w-6 sm:w-7 xl:w-8 h-auto object-contain" alt="icon" />
          <h1 className="text-xl xl:text-2xl font-black text-oro uppercase tracking-[0.3em]">
            INFORMACIÓN <span className="text-naranja-naruto">NINJA</span>
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
            <div className="mb-10 ninja-card-oro p-6 sm:p-8 xl:p-10 relative overflow-hidden group">
              <div className="flex items-center gap-6 mb-3 relative z-10">
                <h1 className="ninja-title text-3xl sm:text-5xl xl:text-7xl uppercase leading-none">
                  Mundo Ninja
                </h1>
              </div>
              <p className="text-gris-texto text-base sm:text-lg xl:text-2xl leading-relaxed relative z-10">
                Explora y descubre toda la información de los ninjas de cada una de las Aldeas y Organizaciones.
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
                    categoryClassName="text-caption sm:text-xs md:text-xs lg:text-sm xl:text-sm font-black text-oro/60 uppercase tracking-[0.1em] sm:tracking-[0.15em] whitespace-nowrap overflow-hidden text-ellipsis"
                    imageUrl={aldea.url_imagen || undefined}
                    description={aldea.descripcion || 'Sin descripción registrada.'}
                    actionText="Ver fichas"
                    headerOverlayRight={
                      <div className="flex flex-col items-start sm:items-end gap-0.5 shrink-0">
                        <span className="text-2xl md:text-3xl xl:text-4xl font-black text-oro tabular-nums leading-none">
                          {actuales}/{maxCupos}
                        </span>
                        <span className="text-caption md:text-xs xl:text-sm font-black text-oro/50 uppercase tracking-widest">
                          SHINOBI
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
                title="Renegados"
                titleClassName={getTitleFontSize('Renegados')}
                category="shinobi sin afiliación"
                categoryClassName="text-caption sm:text-xs md:text-xs lg:text-sm xl:text-sm font-black text-oro/40 uppercase tracking-[0.1em] sm:tracking-[0.15em] whitespace-nowrap overflow-hidden text-ellipsis"
                imageUrl="/assets/images/renegados.webp"
                description="Ninjas sin afiliación o exiliados que actuan fuera del control de las grandes naciones."
                actionText="VER FICHAS"
                headerOverlayRight={
                  <div className="flex flex-col items-start sm:items-end gap-0.5 shrink-0">
                    <span className="text-2xl md:text-3xl xl:text-4xl font-black text-oro tabular-nums leading-none">
                      {getCount(null)}
                    </span>
                    <span className="text-caption md:text-xs xl:text-sm font-black text-oro/250 uppercase tracking-widest">
                      SHINOBI
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
                  <img src="/assets/icons/shuriken.webp" className="w-6 sm:w-7 xl:w-8 h-auto object-contain" alt="icon" />
                </div>
                <div>
                  <h1 className="ninja-title text-4xl xl:text-5xl italic">Gestión de Aldeas y Organizaciones</h1>
                  <p className="text-oro/40 text-caption xl:text-xs font-black uppercase tracking-[0.4em] mt-2">Crea, oculta o elimina aldeas y organizaciones.</p>
                </div>
              </div>
            </header>

            {configReseteo && (
              <div className="mb-6 ninja-card-oro p-8 xl:p-10 relative overflow-hidden group">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                  <div className="space-y-2">
                    <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${configReseteoValue ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                      {configReseteo.titulo}
                    </h2>
                    <p className="text-sm text-oro/60 max-w-2xl font-semibold leading-relaxed">
                      {configReseteo.descripcion}
                    </p>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <span className={`text-xs font-black uppercase tracking-[0.2em] ${configReseteoValue ? 'text-emerald-400' : 'text-naranja-naruto'}`}>
                      {configReseteoValue ? 'GRATUITOS ACTIVADOS' : 'COSTE 25% ACTIVO'}
                    </span>
                    <button
                      onClick={handleToggleReseteos}
                      disabled={updatingReseteo}
                      className={`px-6 py-3 text-xs sm:text-sm font-black uppercase tracking-widest transition-all ${configReseteoValue
                        ? 'ninja-btn-rojo'
                        : 'ninja-btn-oro'
                        }`}
                    >
                      {updatingReseteo ? 'ACTUALIZANDO...' : configReseteoValue ? 'DESACTIVAR' : 'ACTIVAR'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <AldeaList initialAldeas={adminAldeas} />
          </div>
        )}
      </main>
    </div>
  );
}
