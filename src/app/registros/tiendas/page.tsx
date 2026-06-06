'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Trash2, Edit3, RotateCcw, History, X, Check, Loader2, Settings, Lock, ChevronLeft, ChevronRight, Link as LinkIcon } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { AuthService } from '@/services/supabase/auth.service';
import { MasterService } from '@/services/supabase/master.service';
import { TiendasService } from '@/services/supabase/tiendas.service';
import { AdminService } from '@/services/supabase/admin.service';
import { RegistrosService } from '@/services/supabase/registros.service';
import { Tienda, Registro } from '@/domain/types';
import { useToastStore } from '@/components/ui/Toast';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import NinjaCard from '@/components/ui/NinjaCard';
import AdminViewSelector from '@/components/admin/AdminViewSelector';
import { PaginationPageInput } from '@/components/ui/PaginationPageInput';
import { PaginationContainer } from '@/components/ui/PaginationContainer';
import { useRouter } from 'next/navigation';

export default function TiendasPage() {
  const router = useRouter();
  const { addToast } = useToastStore();
  const { confirm: confirmAction } = useConfirmStore();
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewMode, setViewMode] = useState<'player' | 'admin'>('player');
  const [eventCoinName, setEventCoinName] = useState('Monedas de Evento');
  const [isRenameLoading, setIsRenameLoading] = useState(false);
  const [newCoinNameInput, setNewCoinNameInput] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetConfirmationText, setResetConfirmationText] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);

  // Create / Edit Shop Form state
  const [formTienda, setFormTienda] = useState<Partial<Tienda>>({
    nombre: '',
    descripcion: '',
    activo: true,
    es_evento: false,
    nombre_moneda: '',
    url_imagen: ''
  });
  const [isSavingShop, setIsSavingShop] = useState(false);

  // History state
  const [historyData, setHistoryData] = useState<{ list: Registro[], count: number, page: number }>({
    list: [], count: 0, page: 1
  });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');

  useEffect(() => {
    fetchData();
    checkAdmin();
    fetchEventCoinName();
  }, []);

  const checkAdmin = async () => {
    try {
      const { data: { user } } = await AuthService.getUser();
      if (user) {
        const { data: profile } = await createClient().from('profiles').select('role').eq('id', user.id).single();
        setIsAdmin(profile?.role === 'admin');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEventCoinName = async () => {
    try {
      const val = await MasterService.getSystemConfig('moneda_evento_nombre');
      if (val) {
        setEventCoinName(val);
        setNewCoinNameInput(val);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Admins see all, normal users only active shops
      const soloActivas = !isAdmin;
      const list = await TiendasService.getTiendas(false); // Fetch all and we will filter or show inactive with badges
      setTiendas(list);
    } catch (err: any) {
      console.error('Error fetching shops:', err);
      addToast('Error al cargar las tiendas ninja', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Run update if admin role changes
  useEffect(() => {
    fetchData();
  }, [isAdmin]);

  const handleCreateOrEditShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTienda.nombre?.trim()) {
      addToast('El nombre de la tienda es obligatorio', 'error');
      return;
    }

    setIsSavingShop(true);
    try {
      const cleanData: Partial<Tienda> = {
        nombre: formTienda.nombre.trim(),
        descripcion: formTienda.descripcion?.trim() || '',
        activo: formTienda.activo ?? true,
        es_evento: formTienda.es_evento ?? false,
        es_experiencia: formTienda.es_experiencia ?? false,
        nombre_moneda: formTienda.es_evento ? (formTienda.nombre_moneda?.trim() || 'Monedas de Evento') : null,
        url_imagen: formTienda.url_imagen?.trim() || null
      };

      if (formTienda.id) {
        cleanData.id = formTienda.id;
      }

      await AdminService.saveTienda(cleanData);
      addToast(formTienda.id ? 'Tienda actualizada con éxito' : 'Tienda creada con éxito', 'success');
      setIsCreateModalOpen(false);
      setFormTienda({ nombre: '', descripcion: '', activo: true, es_evento: false, nombre_moneda: '', url_imagen: '' });
      fetchData();
    } catch (err: any) {
      console.error(err);
      addToast('Error al guardar la tienda', 'error');
    } finally {
      setIsSavingShop(false);
    }
  };

  const handleDeleteShop = async (id: number) => {
    try {
      await AdminService.deleteTienda(id);
      addToast('Tienda eliminada permanentemente', 'success');
      fetchData();
    } catch (err: any) {
      console.error(err);
      addToast('Error al eliminar la tienda', 'error');
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleGlobalResetCoins = async () => {
    if (resetConfirmationText.toLowerCase() !== 'reiniciar') {
      addToast('Debes escribir "reiniciar" para proceder.', 'error');
      return;
    }
    try {
      await AdminService.reiniciarMonedasEvento();
      addToast(`Se han reiniciado las ${eventCoinName} a 0 para todos los shinobis`, 'success');
      setIsResetConfirmOpen(false);
      setResetConfirmationText('');
    } catch (err: any) {
      console.error(err);
      addToast('Error al reiniciar las monedas de evento', 'error');
    }
  };

  const handleRenameCoin = async () => {
    if (!newCoinNameInput.trim()) {
      addToast('El nombre de la moneda no puede estar vacío', 'error');
      return;
    }
    setIsRenameLoading(true);
    try {
      await AdminService.actualizarNombreMoneda(newCoinNameInput.trim());
      addToast(`Moneda renombrada con éxito a: ${newCoinNameInput}`, 'success');
      setEventCoinName(newCoinNameInput.trim());
    } catch (err: any) {
      console.error(err);
      addToast('Error al renombrar la moneda', 'error');
    } finally {
      setIsRenameLoading(false);
    }
  };

  const handleDeleteRegistro = async (id: number) => {
    const ok = await confirmAction({
      title: 'Eliminar Registro de Compra',
      message: '¿Estás seguro de que quieres eliminar este registro de compra permanentemente?',
      variant: 'danger',
      requireValidation: true
    });
    if (!ok) return;

    try {
      await RegistrosService.deleteRegistro(id);
      addToast('Registro de compra eliminado con éxito', 'success');
      fetchHistory(historyData.page);
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Error al eliminar el registro de compra', 'error');
    }
  };

  // History search
  const fetchHistory = async (page: number) => {
    setHistoryLoading(true);
    try {
      const result = await RegistrosService.getRegistros(page, 10, {
        tipo: 'compra',
        startDate: historyStartDate,
        endDate: historyEndDate
      });
      setHistoryData({ list: result.data || [], count: result.count || 0, page });
    } catch (err) {
      console.error('Error fetching purchases history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (isHistoryOpen) {
      fetchHistory(1);
    }
  }, [isHistoryOpen, historyStartDate, historyEndDate]);

  const listToShow = (isAdmin && viewMode === 'admin') ? tiendas : tiendas.filter(t => t.activo);

  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-12 flex flex-col animate-in fade-in duration-500">
      <div className="max-w-[1750px] mx-auto w-full flex-1">
        <header className="w-full mb-8 ninja-card-oro p-6 xl:p-8 flex flex-col md:flex-row justify-between items-center gap-6 z-50">
          <Breadcrumbs
            items={[
              { label: 'Inicio', href: '/' },
              { label: 'Registros', href: '/registros' },
              { label: 'Tiendas Ninja' }
            ]}
          />
          <div className="flex items-center gap-4">
            <ShoppingBag className="w-5 xl:w-6 h-auto text-oro animate-pulse" />
            <h1 className="text-xl xl:text-2xl font-black text-oro uppercase tracking-[0.3em]">
              Tiendas <span className="text-oro/40">Ninja</span>
            </h1>
          </div>
        </header>

        <AdminViewSelector
          isAdmin={isAdmin}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          title="Panel de Control de Tiendas"
        />

        {/* Admin Tools Panel */}
        {isAdmin && viewMode === 'admin' && (
          <section className="mb-10 ninja-card-oro p-6 sm:p-8 xl:p-10 animate-in slide-in-from-top duration-500">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-oro/10">
              <Settings className="w-5 h-5 text-oro" />
              <h2 className="text-sm sm:text-base font-black text-oro uppercase tracking-[0.2em]">Panel de Control Administrativo</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
              {/* Renombrar Moneda */}
              <div className="space-y-4 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-black text-oro/60 uppercase tracking-widest mb-1">Renombrar Divisa de Evento</label>
                  <p className="text-caption text-gris-texto mb-2">Cambia el nombre oficial de la moneda de evento en todo el juego.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    value={newCoinNameInput}
                    onChange={(e) => setNewCoinNameInput(e.target.value)}
                    className="ninja-input py-2.5 px-4 flex-1 text-xs w-full"
                    placeholder="Ej. Monedas de Plata"
                  />
                  <button
                    onClick={handleRenameCoin}
                    disabled={isRenameLoading}
                    className="ninja-btn-oro py-2.5 px-5 flex items-center justify-center gap-2 text-xs w-full sm:w-auto shrink-0"
                  >
                    {isRenameLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Guardar</span>
                  </button>
                </div>
              </div>

              {/* Botón Reinicio Global */}
              <div className="space-y-4 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-black text-oro/60 uppercase tracking-widest mb-1">Restaurar Economía</label>
                  <p className="text-caption text-gris-texto">Reinicia la divisa de evento a 0 de todos los personajes.</p>
                </div>
                <button
                  onClick={() => {
                    setResetConfirmationText('');
                    setIsResetConfirmOpen(true);
                  }}
                  className="w-full ninja-btn-rojo py-3 flex items-center justify-center gap-3 text-xs"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reiniciar Monedas de Evento</span>
                </button>
              </div>

              {/* Acciones CRUD */}
              <div className="space-y-4 flex flex-col justify-between md:col-span-2 xl:col-span-1 mt-4 md:mt-0">
                <div>
                  <label className="block text-xs font-black text-oro/60 uppercase tracking-widest mb-1">Creación y Catálogos</label>
                  <p className="text-caption text-gris-texto">Crea una nueva tienda.</p>
                </div>
                <button
                  onClick={() => {
                    setFormTienda({ nombre: '', descripcion: '', activo: true, es_evento: false, nombre_moneda: '', url_imagen: '' });
                    setIsCreateModalOpen(true);
                  }}
                  className="w-full ninja-btn-oro py-3 flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear Nueva Tienda</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Global actions: History button */}
        <div className="flex justify-between items-center mb-8">
          <p className="text-xs sm:text-sm font-black text-oro/60 uppercase tracking-widest">
            {loading ? 'Cargando Tiendas...' : `${listToShow.length} Tiendas Disponibles`}
          </p>
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="ninja-btn-ghost py-2 px-4 text-xs font-black uppercase tracking-widest flex items-center gap-2"
          >
            <History className="w-4 h-4" />
            <span>Ver Historial de Compras</span>
          </button>
        </div>

        {/* Shops Grid */}
        {loading ? (
          <div className="py-40 flex flex-col items-center gap-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-oro/20 border-t-oro rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <img src="/assets/icons/shuriken.png" className="w-5 h-5 object-contain" alt="Loader" />
              </div>
            </div>
            <p className="text-oro font-black uppercase tracking-[0.4em] text-xs animate-pulse">Abriendo mercados...</p>
          </div>
        ) : listToShow.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
            {listToShow.map((tienda) => {
              const isExperience = tienda.es_experiencia;
              return (
                <NinjaCard
                  key={tienda.id}
                  onClick={() => router.push(`/registros/tiendas/${tienda.id}`)}
                  title={tienda.nombre}
                  description={tienda.descripcion}
                  category={isExperience ? 'Tienda Experiencia' : tienda.es_evento ? 'Tienda Evento' : 'Tienda'}
                  theme="oro"
                  imageUrl={tienda.url_imagen || (
                    isExperience
                      ? 'https://game.gtimg.cn/images/hyrz/web2026/ninja.jpg'
                      : tienda.es_evento
                        ? 'https://game.gtimg.cn/images/hyrz/web2026/match.jpg'
                        : 'https://game.gtimg.cn/images/hyrz/web2026/player.jpg'
                  )}
                  headerOverlayRight={
                    <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                      {!tienda.activo && (
                        <span className="px-3 py-1 bg-zinc-950 border border-zinc-500/30 text-zinc-400 text-caption font-black uppercase tracking-widest" style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}>
                          Inactiva
                        </span>
                      )}
                      {isAdmin && viewMode === 'admin' && (
                        <>
                          <button
                            onClick={() => {
                              setFormTienda(tienda);
                              setIsCreateModalOpen(true);
                            }}
                            className="p-1.5 border border-oro/20 bg-zinc-950/80 hover:border-oro hover:bg-oro/10 text-oro/70 hover:text-oro transition-all"
                            style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                            title="Editar Tienda"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {!isExperience && (
                            <button
                              onClick={() => setIsDeletingId(tienda.id)}
                              className="p-1.5 border border-error-text/20 bg-zinc-950/80 hover:border-error-text hover:bg-red-500/10 text-red-400 transition-all"
                              style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                              title="Eliminar Tienda"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  }
                  footerRight={
                    tienda.es_evento ? (
                      <div className="border border-oro/10 bg-black/40 py-1.5 px-3" style={{ clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)' }}>
                        <span className="text-caption sm:text-xs font-black text-oro/60 uppercase tracking-widest block">
                          {tienda.nombre_moneda || eventCoinName}
                        </span>
                      </div>
                    ) : tienda.es_experiencia ? (
                      <div className="border border-oro/10 bg-black/40 py-1.5 px-3" style={{ clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)' }}>
                        <span className="text-caption sm:text-xs font-black text-oro/60 uppercase tracking-widest block">
                          Experiencia
                        </span>
                      </div>
                    ) : undefined
                  }
                  actionText="Entrar a Comprar"
                  className={!tienda.activo ? 'opacity-60 hover:opacity-100' : ''}
                />
              );
            })}
          </div>
        ) : (
          <div className="py-40 text-center ninja-card-oro border-dashed opacity-60 max-w-lg mx-auto" style={{ clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)' }}>
            <ShoppingBag className="w-16 h-16 text-oro/20 mx-auto mb-6" />
            <h3 className="text-lg font-black text-oro uppercase tracking-wider mb-2">No hay tiendas registradas</h3>
            <p className="text-xs text-gris-texto mb-6">El administrador no ha habilitado ninguna tienda todavía.</p>
            {isAdmin && viewMode === 'admin' && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="ninja-btn-oro px-6 py-3 text-xs font-black uppercase tracking-widest inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Primera Tienda</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* CREATE / EDIT SHOP MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div
            className="w-full max-w-lg ninja-card-oro p-8 relative"
            style={{ clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)' }}
          >
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-6 right-6 p-2 text-oro/40 hover:text-oro transition-all"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-xl sm:text-2xl font-black text-oro uppercase tracking-wider mb-6 pb-2 border-b border-oro/10">
              {formTienda.id ? 'Editar Tienda' : 'Crear Nueva Tienda'}
            </h2>

            <form onSubmit={handleCreateOrEditShop} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-black text-oro/60 uppercase tracking-widest">Nombre de la Tienda</label>
                <input
                  type="text"
                  value={formTienda.nombre || ''}
                  onChange={(e) => setFormTienda({ ...formTienda, nombre: e.target.value })}
                  className="ninja-input py-3 w-full"
                  placeholder="Ej. Armería de Konoha"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-oro/60 uppercase tracking-widest">Descripción</label>
                <textarea
                  value={formTienda.descripcion || ''}
                  onChange={(e) => setFormTienda({ ...formTienda, descripcion: e.target.value })}
                  className="ninja-input py-3 w-full min-h-[80px]"
                  placeholder="Ej. Artículos ninja comunes a precios estándar..."
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-oro/60 uppercase tracking-widest">URL de la Imagen</label>
                <input
                  type="text"
                  value={formTienda.url_imagen || ''}
                  onChange={(e) => setFormTienda({ ...formTienda, url_imagen: e.target.value })}
                  className="ninja-input py-3 w-full"
                  placeholder="Ej. https://i.imgur.com/... o https://game.gtimg.cn/..."
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!formTienda.activo}
                    onChange={(e) => setFormTienda({ ...formTienda, activo: e.target.checked })}
                    className="w-4 h-4 accent-oro"
                  />
                  <span className="text-xs font-black text-oro/80 uppercase tracking-widest">Tienda Activa</span>
                </label>

                {formTienda.es_experiencia ? null : (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!formTienda.es_evento}
                      onChange={(e) => setFormTienda({ ...formTienda, es_evento: e.target.checked })}
                      className="w-4 h-4 accent-oro"
                    />
                    <span className="text-xs font-black text-oro/80 uppercase tracking-widest">Tienda de Evento</span>
                  </label>
                )}
              </div>

              {formTienda.es_evento && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <label className="block text-xs font-black text-oro/60 uppercase tracking-widest">Nombre de Moneda del Evento</label>
                  <input
                    type="text"
                    value={formTienda.nombre_moneda || ''}
                    onChange={(e) => setFormTienda({ ...formTienda, nombre_moneda: e.target.value })}
                    className="ninja-input py-3 w-full"
                    placeholder={`Por defecto: ${eventCoinName}`}
                  />
                </div>
              )}

              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 ninja-btn-ghost py-3 font-black text-xs uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingShop}
                  className="flex-1 ninja-btn-oro py-3 flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest"
                >
                  {isSavingShop ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{formTienda.id ? 'Guardar Cambios' : 'Crear Tienda'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET CONFIRMATION MODAL */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div
            className="w-full max-w-md ninja-card-oro p-8 relative text-center"
            style={{ clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)' }}
          >
            <h2 className="text-xl font-black text-red-400 uppercase tracking-wider mb-4">¿Confirmar Acción Crítica?</h2>
            <p className="text-xs sm:text-sm text-gris-texto leading-relaxed mb-4">
              Estás a punto de <strong className="font-bold text-red-400">reiniciar las {eventCoinName} de todos los jugadores a 0</strong>. Esta acción es destructiva e irreversible. ¿Estás seguro de continuar?
            </p>
            <p className="text-xs text-gris-texto/80 mb-3">
              Para poder reiniciar, escribe <strong className="font-bold text-oro uppercase">reiniciar</strong> a continuación:
            </p>

            <input
              type="text"
              value={resetConfirmationText}
              onChange={(e) => setResetConfirmationText(e.target.value)}
              className="ninja-input py-2.5 px-4 text-center text-sm w-full mb-6"
              placeholder="Escribe 'reiniciar' para confirmar"
            />

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setIsResetConfirmOpen(false);
                  setResetConfirmationText('');
                }}
                className="flex-1 ninja-btn-ghost py-3 font-black text-xs uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button
                onClick={handleGlobalResetCoins}
                disabled={resetConfirmationText.toLowerCase() !== 'reiniciar'}
                className="flex-1 ninja-btn-rojo py-3 font-black text-xs uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Sí, Reiniciar Todo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETING SHOP CONFIRM MODAL */}
      {isDeletingId !== null && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div
            className="w-full max-w-md ninja-card-oro p-8 relative text-center"
            style={{ clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)' }}
          >
            <Lock className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-black text-red-400 uppercase tracking-wider mb-4">¿Eliminar Tienda?</h2>
            <p className="text-xs sm:text-sm text-gris-texto leading-relaxed mb-6">
              Eliminarás permanentemente esta tienda. Esto <strong className="font-bold text-red-400">no eliminará</strong> los objetos ya comprados por los personajes ni los registros.
            </p>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setIsDeletingId(null)}
                className="flex-1 ninja-btn-ghost py-3 font-black text-xs uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteShop(isDeletingId)}
                className="flex-1 ninja-btn-rojo py-3 font-black text-xs uppercase tracking-widest"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY OF PURCHASES MODAL */}
      {isHistoryOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[998] flex items-center justify-center p-4 sm:p-8 xl:p-12 animate-in fade-in duration-300">
          <div
            className="w-full max-w-[1500px] h-[90vh] ninja-card-oro p-6 sm:p-10 relative flex flex-col overflow-hidden"
            style={{ clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)' }}
          >

            <button
              onClick={() => setIsHistoryOpen(false)}
              className="absolute top-6 right-6 p-2 text-oro/40 hover:text-oro transition-all z-10"
            >
              <X className="w-7 h-7" />
            </button>

            <h2 className="text-2xl font-black text-oro uppercase tracking-[0.2em] mb-6 pb-3 border-b border-oro/10 flex items-center gap-4">
              <History className="w-6 h-6 text-oro" />
              <span>Auditoría e Historial de Compras</span>
            </h2>

            {/* Date Filters */}
            <div className="flex flex-wrap items-center gap-6 p-6 mb-8 border border-oro/10 bg-black/30 ninja-clip-md">
              <div className="flex items-center gap-4">
                <span className="text-caption sm:text-xs font-black text-oro/40 uppercase tracking-widest">DESDE</span>
                <input
                  type="date"
                  value={historyStartDate}
                  onChange={(e) => setHistoryStartDate(e.target.value)}
                  className="ninja-input py-2"
                />
              </div>
              <div className="flex items-center gap-4">
                <span className="text-caption sm:text-xs font-black text-oro/40 uppercase tracking-widest">HASTA</span>
                <input
                  type="date"
                  value={historyEndDate}
                  onChange={(e) => setHistoryEndDate(e.target.value)}
                  className="ninja-input py-2"
                />
              </div>
              {(historyStartDate || historyEndDate) && (
                <button
                  onClick={() => { setHistoryStartDate(''); setHistoryEndDate(''); }}
                  className="text-xs font-black text-rojo-sangre uppercase tracking-widest hover:brightness-125 border-b border-rojo-sangre/30 pb-1 italic transition-all"
                >
                  LIMPIAR FILTROS
                </button>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto pr-2">
              {historyLoading ? (
                <div className="py-40 flex flex-col items-center gap-6">
                  <Loader2 className="w-10 h-10 text-oro animate-spin" />
                  <p className="text-oro font-black uppercase tracking-widest text-xs">Cargando registros...</p>
                </div>
              ) : historyData.list.length > 0 ? (
                <div className="ninja-card-oro overflow-hidden border border-oro/20 bg-black/40 backdrop-blur-sm ninja-clip-md">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                      <thead>
                        <tr className="border-b border-oro/10 text-oro/40 text-caption xl:text-xs font-black uppercase tracking-[0.3em]">
                          <th className="py-6 px-8">Comprador</th>
                          <th className="py-6 px-8">Fecha/Hora</th>
                          <th className="py-6 px-8">Objeto Adquirido</th>
                          <th className="py-6 px-8 text-center">Inversión</th>
                          <th className="py-6 px-8 text-center">Pruebas</th>
                          {isAdmin && viewMode === 'admin' && <th className="py-6 px-8 text-right">Acciones</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-oro/5">
                        {historyData.list.map((reg) => {
                          const authorName = reg.autor?.nombre_ninja ||
                            reg.data?.participantes_historicos?.find((p: any) => p.id === reg.autor_id)?.nombre_ninja ||
                            'Ninja Desaparecido';

                          const formattedDate = new Date(reg.fecha).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          }) + ' - ' + new Date(reg.fecha).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit'
                          });

                          return (
                            <tr key={reg.id} className="hover:bg-oro/5 transition-colors">
                              <td className="py-6 px-8">
                                <span className="text-xs sm:text-sm font-black text-oro uppercase tracking-widest">{authorName}</span>
                              </td>
                              <td className="py-6 px-8">
                                <span className="text-caption font-bold text-oro/40 uppercase tracking-widest">{formattedDate}</span>
                              </td>
                              <td className="py-6 px-8">
                                <div className="flex flex-col gap-1">
                                  <span className="text-xs sm:text-sm font-black text-oro/80 uppercase tracking-widest">
                                    {reg.data.objeto_nombre || reg.data.objeto || 'Equipo Ninja'}
                                  </span>
                                  {reg.data.detalles && (
                                    <span className="text-caption font-bold text-oro/40 uppercase tracking-wider">
                                      {reg.data.detalles}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-6 px-8 text-center">
                                <div className="flex flex-col gap-1 items-center justify-center">
                                  {(reg.data.coste_exp || 0) > 0 && (
                                    <span className="text-[11px] font-black text-blue-400 tracking-widest whitespace-nowrap">
                                      -{reg.data.coste_exp.toLocaleString()} EXP
                                    </span>
                                  )}
                                  {(reg.data.coste_ryous || 0) > 0 && (
                                    <span className="text-[11px] font-black text-oro tracking-widest whitespace-nowrap">
                                      -{reg.data.coste_ryous.toLocaleString()} RYOUS
                                    </span>
                                  )}
                                  {(reg.data.coste_moneda_evento || 0) > 0 && (
                                    <span className="text-[11px] font-black text-amber-500 tracking-widest whitespace-nowrap font-sans">
                                      -{reg.data.coste_moneda_evento.toLocaleString()} EVENTO
                                    </span>
                                  )}
                                  {(reg.data.coste_exp || 0) === 0 && (reg.data.coste_ryous || 0) === 0 && (reg.data.coste_moneda_evento || 0) === 0 && (
                                    <span className="text-caption text-oro/20 uppercase tracking-widest italic">Gratis</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-6 px-8">
                                <div className="flex flex-wrap justify-center gap-2">
                                  {reg.data.urls_imagenes && reg.data.urls_imagenes.length > 0 ? (
                                    reg.data.urls_imagenes.map((url: string, i: number) => (
                                      <a
                                        key={i}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-3 py-1 bg-oro/5 border border-oro/10 hover:border-oro/40 hover:bg-oro/10 text-caption font-black text-oro/70 hover:text-oro uppercase tracking-widest transition-all ninja-clip-xs"
                                      >
                                        <LinkIcon className="w-2.5 h-2.5" />
                                        <span>Prueba {i + 1}</span>
                                      </a>
                                    ))
                                  ) : (
                                    <span className="text-caption font-bold text-oro/20 uppercase tracking-widest italic">Sin pruebas</span>
                                  )}
                                </div>
                              </td>
                              {isAdmin && viewMode === 'admin' && (
                                <td className="py-6 px-8 text-right">
                                  <button
                                    onClick={() => handleDeleteRegistro(reg.id)}
                                    className="w-8 h-8 inline-flex items-center justify-center bg-red-600/10 border border-red-600/40 hover:border-error-text hover:bg-red-600/20 text-red-500 hover:text-red-400 transition-all ninja-clip-xs shadow-lg shadow-black/20"
                                    title="Eliminar Registro de Compra"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="py-40 text-center opacity-60">
                  <ShoppingBag className="w-16 h-16 text-oro/10 mx-auto mb-4" />
                  <p className="text-sm font-black text-oro/20 uppercase tracking-[0.4em] italic">No hay transacciones registradas</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {historyData.list.length > 0 && !historyLoading && (
              <div className="pt-6 border-t border-oro/10 mt-6 bg-transparent w-full">
                <PaginationContainer maxWidthClass="max-w-md">
                  <button
                    disabled={historyData.page === 1}
                    onClick={() => fetchHistory(historyData.page - 1)}
                    className="p-3 ninja-btn-oro shrink-0"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-1.5 justify-center text-xs font-black text-oro uppercase tracking-widest italic">
                    PÁGINA
                    <PaginationPageInput
                      currentPage={historyData.page}
                      totalPages={Math.ceil(historyData.count / 10) || 1}
                      onChangePage={(p) => fetchHistory(p)}
                    />
                    <span className="text-oro/40">DE {Math.ceil(historyData.count / 10) || 1}</span>
                  </div>
                  <button
                    disabled={historyData.list.length < 10 || historyData.page * 10 >= historyData.count}
                    onClick={() => fetchHistory(historyData.page + 1)}
                    className="p-3 ninja-btn-oro shrink-0"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </PaginationContainer>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
