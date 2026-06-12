'use client';

import { useState, useEffect } from 'react';
import { ProfileService } from '@/services/supabase/profile.service';
import { useToastStore } from '@/components/ui/Toast';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';
import { ShieldAlert, Search, UserCheck, ShieldOff, Calendar, AlertCircle, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { PaginationContainer } from '@/components/ui/PaginationContainer';
import { PaginationPageInput } from '@/components/ui/PaginationPageInput';

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Modal State
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState('1'); // Days, or 'custom', or 'permanent'
  const [customDate, setCustomDate] = useState('');

  const addToast = useToastStore(state => state.addToast);
  const { confirm: confirmAction } = useConfirmStore();

  const fetchUsers = async () => {
    try {
      const data = await ProfileService.getUsersList();
      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (err) {
      console.error(err);
      addToast('Error al cargar usuarios', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = users.filter(u => {
      const usernameMatch = u.username?.toLowerCase().includes(term);
      const discordMatch = u.discord_id?.toLowerCase().includes(term);
      const charMatch = u.active_character?.nombre_ninja?.toLowerCase().includes(term);
      const ipMatch = u.last_ip?.toLowerCase().includes(term);
      return usernameMatch || discordMatch || charMatch || ipMatch;
    });
    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [searchTerm, users]);

  const handleOpenBan = (user: any) => {
    setSelectedUser(user);
    setBanReason('');
    setBanDuration('1');
    setCustomDate('');
    setBanModalOpen(true);
  };

  const handleBan = async () => {
    if (!selectedUser) return;
    if (!banReason.trim()) {
      addToast('Por favor, indica un motivo para el baneo.', 'error');
      return;
    }

    let bannedUntilISO: string | null = null;
    const now = new Date();

    if (banDuration === 'permanent') {
      // Baneo de 100 años para simular permanente de forma limpia en fecha
      const farFuture = new Date();
      farFuture.setFullYear(now.getFullYear() + 100);
      bannedUntilISO = farFuture.toISOString();
    } else if (banDuration === 'custom') {
      if (!customDate) {
        addToast('Por favor, selecciona una fecha personalizada.', 'error');
        return;
      }
      bannedUntilISO = new Date(customDate).toISOString();
    } else {
      const days = parseInt(banDuration, 10);
      const expireDate = new Date();
      expireDate.setDate(now.getDate() + days);
      bannedUntilISO = expireDate.toISOString();
    }

    try {
      setLoading(true);
      await ProfileService.banUser(selectedUser.id, banReason, bannedUntilISO);
      addToast(`Usuario ${selectedUser.username} suspendido correctamente.`, 'success');
      setBanModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Error al suspender al usuario', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUnban = async (user: any) => {
    const ok = await confirmAction({
      title: 'Desbloquear Usuario',
      message: `¿Estás seguro de que quieres levantar la suspensión al usuario ${user.username}? Se reactivará su cuenta y su IP de conexión.`,
      variant: 'primary'
    });

    if (!ok) return;

    try {
      setLoading(true);
      await ProfileService.unbanUser(user.id);
      addToast(`Suspensión levantada para ${user.username}.`, 'success');
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Error al desbanear al usuario', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (user: any) => {
    if (user.banned_until) {
      const bannedUntil = new Date(user.banned_until);
      const now = new Date();
      if (bannedUntil > now) {
        // Calcular si es baneo permanente (>90 años)
        const yearsDiff = bannedUntil.getFullYear() - now.getFullYear();
        const label = yearsDiff > 90 
          ? 'SUSPENDIDO PERMANENTE' 
          : `BANEADO HASTA: ${bannedUntil.toLocaleDateString()} ${bannedUntil.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        return (
          <span className="text-caption font-black text-red-400 bg-red-950/20 border border-red-500/30 px-3 py-1 ninja-clip-xs uppercase tracking-wider block text-center max-w-xs">
            {label}
          </span>
        );
      }
    }
    return (
      <span className="text-caption font-black text-emerald-400 bg-emerald-950/20 border border-emerald-500/30 px-3 py-1 ninja-clip-xs uppercase tracking-wider block text-center max-w-[120px]">
        ACTIVO
      </span>
    );
  };

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="max-w-[1750px]">
      <header className="mb-6 ninja-card-oro p-8 xl:p-10">
        <Link href="/admin" className="flex items-center gap-3 text-oro/40 hover:text-oro transition-all mb-8 text-caption font-black uppercase tracking-[0.3em] group">
          <div className="w-1.5 h-1.5 bg-oro/20 group-hover:bg-oro rotate-45 transition-colors" />
          VOLVER AL PANEL CENTRAL
        </Link>

        <div className="flex items-center gap-6">
          <div className="w-12 h-12 bg-rojo-sangre/10 border border-oro/25 flex items-center justify-center shadow-[0_0_15px_rgba(103,9,9,0.4)]">
            <ShieldAlert className="w-6 h-6 text-oro" />
          </div>
          <div>
            <h1 className="ninja-title text-4xl xl:text-5xl italic">CONTROL DE USUARIOS Y BANEO</h1>
            <p className="text-oro/40 text-caption xl:text-xs font-black uppercase tracking-[0.4em] mt-2">ADMINISTRACIÓN DE ACCESOS, CUENTAS E IPS</p>
          </div>
        </div>
      </header>

      {/* Buscador */}
      <div className="mb-8 ninja-card-oro p-6 flex items-center gap-4">
        <Search className="w-5 h-5 text-oro/40 shrink-0" />
        <input
          type="text"
          placeholder="BUSCAR POR NOMBRE, DISCORD, PERSONAJE O DIRECCIÓN IP..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent text-oro outline-none placeholder:text-oro/20 text-xs sm:text-sm font-bold uppercase tracking-wider"
        />
      </div>

      {loading && users.length === 0 ? (
        <div className="py-24 text-center">
          <div className="w-12 h-12 border-4 border-rojo-sangre/20 border-t-oro rounded-full animate-spin mx-auto mb-4" />
          <p className="text-oro/40 text-xs font-black uppercase tracking-[0.3em] italic">Cargando ninja list...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="py-24 text-center ninja-card-oro">
          <AlertCircle className="w-16 h-16 text-oro/20 mx-auto mb-4 opacity-20" />
          <p className="text-oro/40 font-black uppercase italic tracking-[0.3em] text-sm">NO SE ENCONTRARON USUARIOS</p>
        </div>
      ) : (
        <>
          <div className="ninja-card-oro p-6 overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left border-collapse">
            <thead>
              <tr className="border-b border-oro/10 text-caption font-black uppercase tracking-widest text-oro/40">
                <th className="pb-4 pl-4">Usuario</th>
                <th className="pb-4">Discord ID</th>
                <th className="pb-4">Personaje Activo</th>
                <th className="pb-4">IP Conexión</th>
                <th className="pb-4">Estado</th>
                <th className="pb-4 text-right pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-oro/5 text-sm font-bold">
              {paginatedUsers.map((u) => {
                const isBanned = u.banned_until && new Date(u.banned_until) > new Date();
                return (
                  <tr key={u.id} className="hover:bg-oro/5 transition-all duration-300">
                    {/* Usuario */}
                    <td className="py-4 pl-4 flex items-center gap-3">
                      <div className="w-10 h-10 border border-oro/25 overflow-hidden bg-black/40 flex items-center justify-center shrink-0 ninja-clip-xs">
                        {u.url_avatar || u.url_img ? (
                          <img src={u.url_avatar || u.url_img} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-oro/40 text-lg uppercase font-black">{u.username?.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-oro font-black block uppercase tracking-wider">{u.username}</span>
                        <span className="text-caption text-oro/30 font-black uppercase tracking-widest">{u.role}</span>
                      </div>
                    </td>

                    {/* Discord */}
                    <td className="py-4 text-oro/80 font-mono text-xs">{u.discord_id || 'SIN VINCULAR'}</td>

                    {/* Personaje Activo */}
                    <td className="py-4">
                      {u.active_character ? (
                        <div>
                          <span className="text-oro block uppercase tracking-wider italic font-black">
                            {u.active_character.nombre_ninja}
                          </span>
                          <span className="text-caption text-oro/30 font-black uppercase tracking-widest">
                            {u.active_character.rango} • {u.active_character.aldeas?.nombre_completo || 'Renegado'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-oro/20 uppercase text-caption tracking-widest">SIN FICHA ACTIVA</span>
                      )}
                    </td>

                    {/* IP */}
                    <td className="py-4 text-oro/70 font-mono text-xs">{u.last_ip || 'SIN IP REGISTRADA'}</td>

                    {/* Estado */}
                    <td className="py-4">{getStatusBadge(u)}</td>

                    {/* Acciones */}
                    <td className="py-4 text-right pr-4">
                      {isBanned ? (
                        <button
                          onClick={() => handleUnban(u)}
                          className="px-4 py-2 border border-emerald-500/30 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all font-black text-caption uppercase tracking-wider cursor-pointer"
                          style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                        >
                          <UserCheck className="w-3.5 h-3.5 inline mr-1.5" />
                          Desbloquear
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenBan(u)}
                          className="px-4 py-2 border border-rojo-sangre/30 bg-rojo-sangre/10 text-red-400 hover:bg-rojo-sangre hover:text-oro transition-all font-black text-caption uppercase tracking-wider cursor-pointer"
                          style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                        >
                          <ShieldOff className="w-3.5 h-3.5 inline mr-1.5" />
                          Suspender
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-8 flex justify-center w-full">
            <PaginationContainer maxWidthClass="max-w-md">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center ninja-btn-oro shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" />
              </button>

              <div className="flex flex-col items-center px-3 text-center">
                <span className="text-caption font-black text-oro/40 uppercase tracking-[0.25em] mb-1">
                  PÁGINA
                </span>
                <div className="flex items-center gap-1.5 justify-center text-caption sm:text-sm xl:text-base font-black text-oro uppercase tracking-[0.18em] italic">
                  <PaginationPageInput
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onChangePage={(p) => setCurrentPage(p)}
                  />
                  <span className="text-oro/40">DE {totalPages}</span>
                </div>
              </div>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center ninja-btn-oro shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7" />
              </button>
            </PaginationContainer>
          </div>
        )}
      </>
    )}

      {/* Modal de Baneo */}
      {banModalOpen && selectedUser && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md" onClick={() => setBanModalOpen(false)} />
          <div className="relative w-full max-w-2xl ninja-card-rojo p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-in zoom-in-95">
            <h3 className="text-xl font-black uppercase text-rojo-sangre mb-2 font-ninja tracking-wider">
              Suspender Cuenta e IP
            </h3>
            <p className="text-oro/40 text-caption font-black uppercase tracking-widest mb-6 border-b border-oro/10 pb-2">
              Usuario: {selectedUser.username}
            </p>

            <div className="space-y-6">
              {/* Motivo */}
              <div className="space-y-2">
                <label className="text-caption font-black uppercase tracking-wider text-oro/50 block">
                  Motivo del Baneo
                </label>
                <textarea
                  placeholder="Especifica el motivo de la suspensión..."
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="w-full bg-black border border-oro/15 p-4 text-xs text-oro placeholder:text-oro/20 focus:border-rojo-sangre outline-none min-h-[100px] resize-none"
                />
              </div>

              {/* Duración */}
              <div className="space-y-2">
                <label className="text-caption font-black uppercase tracking-wider text-oro/50 block">
                  Duración del Baneo
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: '1 Día', val: '1' },
                    { label: '3 Días', val: '3' },
                    { label: '7 Días', val: '7' },
                    { label: '30 Días', val: '30' },
                    { label: 'Permanente', val: 'permanent' },
                    { label: 'Personalizado', val: 'custom' }
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => setBanDuration(opt.val)}
                      type="button"
                      className={`py-2 px-3 border font-black text-caption uppercase tracking-wider transition-all cursor-pointer ${
                        banDuration === opt.val
                          ? 'bg-oro text-rojo-sangre border-oro shadow-[0_0_10px_rgba(255,230,159,0.2)]'
                          : 'border-oro/15 bg-black/40 text-oro/70 hover:border-oro/40'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector de fecha personalizado */}
              {banDuration === 'custom' && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-caption font-black uppercase tracking-wider text-oro/50 block">
                    Selecciona Fecha y Hora Expiración
                  </label>
                  <input
                    type="datetime-local"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full bg-black border border-oro/15 p-4 text-xs text-oro outline-none focus:border-rojo-sangre cursor-pointer"
                    style={{ colorScheme: 'dark' }}
                    onClick={(e) => {
                      try {
                        (e.target as any).showPicker();
                      } catch (err) {}
                    }}
                  />
                </div>
              )}

              {/* Advertencia de IP */}
              {selectedUser.last_ip && (
                <div className="p-4 border border-rojo-sangre/20 bg-rojo-sangre/5 text-left rounded flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rojo-sangre shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300 leading-normal font-semibold">
                    **Nota**: Se bloqueará automáticamente el acceso a la IP **{selectedUser.last_ip}** durante el mismo periodo de tiempo.
                  </p>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex gap-4 pt-4 border-t border-oro/10">
                <button
                  onClick={() => setBanModalOpen(false)}
                  type="button"
                  className="flex-1 py-3 bg-black/40 text-oro/60 border border-oro/15 hover:text-oro transition-all font-black text-caption uppercase tracking-[0.2em] cursor-pointer"
                  style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleBan}
                  type="button"
                  className="flex-1 py-3 bg-rojo-sangre text-oro hover:brightness-110 shadow-lg transition-all font-black text-caption uppercase tracking-[0.2em] cursor-pointer"
                  style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                >
                  Aplicar Suspensión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
