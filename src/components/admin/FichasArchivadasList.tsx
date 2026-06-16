'use client';

import { useState, useMemo } from 'react';
import { Search, RefreshCw, Trash2, ShieldAlert, Sparkles, User, Clock, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToastStore } from '@/components/ui/Toast';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';
import { searchAny } from '@/lib/utils/search';

interface Profile {
  username: string;
}

interface ArchivedCharacter {
  id: number;
  nombre_ninja: string;
  hobba_name: string;
  rango: string;
  rango_jerarquico: string;
  url_img?: string;
  eliminado_voluntario: boolean;
  archived_at: string;
  created_at?: string;
  user_id: string;
  profiles?: Profile | Profile[];
}

export default function FichasArchivadasList({ initialCharacters }: { initialCharacters: ArchivedCharacter[] }) {
  const [activeTab, setActiveTab] = useState<'all' | 'voluntary' | 'inactivity'>('all');
  const [search, setSearch] = useState('');
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const router = useRouter();
  const addToast = useToastStore(state => state.addToast);
  const { confirm: confirmAction } = useConfirmStore();

  const getUsername = (character: ArchivedCharacter) => {
    if (character.profiles) {
      if (Array.isArray(character.profiles)) {
        return character.profiles[0]?.username || character.hobba_name;
      }
      return character.profiles.username || character.hobba_name;
    }
    return character.hobba_name;
  };

  const getRemainingDays = (character: ArchivedCharacter) => {
    const baseDateStr = character.archived_at || character.created_at;
    if (!baseDateStr) return null;
    const baseDate = new Date(baseDateStr);
    const limitDate = new Date(baseDate);
    if (character.eliminado_voluntario) {
      // Voluntary: 3 months post-archive
      limitDate.setMonth(baseDate.getMonth() + 3);
    } else {
      // Inactivity: 9 months post-archive if archived_at is set, or 12 months total if falling back to created_at
      if (character.archived_at) {
        limitDate.setMonth(baseDate.getMonth() + 9);
      } else {
        limitDate.setMonth(baseDate.getMonth() + 12);
      }
    }
    const diffTime = limitDate.getTime() - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleRestore = async (characterId: number, name: string) => {
    const ok = await confirmAction({
      title: '¿Restaurar Shinobi?',
      message: `¿Estás seguro de que deseas restaurar al shinobi ${name}? Volverá a estar activo y contará para los límites de personajes de la cuenta.`,
      variant: 'primary',
      confirmLabel: 'Restaurar',
      cancelLabel: 'Cancelar'
    });
    if (!ok) return;

    setLoadingId(characterId);
    try {
      const response = await fetch(`/api/characters/${characterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'restore' })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al restaurar personaje');
      }

      addToast(`Shinobi ${name} restaurado correctamente.`, 'success');
      router.refresh();
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Error al restaurar shinobi', 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (characterId: number, name: string) => {
    const ok = await confirmAction({
      title: '¿ELIMINAR DEFINITIVAMENTE?',
      message: `¡CUIDADO! Esta acción eliminará permanentemente al shinobi ${name} de forma física e inmediata. Esto borrará su inventario, técnicas y ramas asociadas de forma irreversible.`,
      variant: 'danger',
      confirmLabel: 'ELIMINAR',
      cancelLabel: 'Cancelar',
      requireValidation: true
    });
    if (!ok) return;

    setLoadingId(characterId);
    try {
      const response = await fetch(`/api/characters/${characterId}?force=true`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar personaje');
      }

      addToast(`Shinobi ${name} eliminado de manera definitiva del registro mundial.`, 'success');
      router.refresh();
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Error al eliminar definitivamente', 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const filteredCharacters = useMemo(() => {
    return initialCharacters.filter(char => {
      const matchesTab =
        activeTab === 'all'
          ? true
          : activeTab === 'voluntary'
            ? char.eliminado_voluntario
            : !char.eliminado_voluntario;

      const matchesSearch = searchAny(search, [char.nombre_ninja, getUsername(char), char.rango]);

      return matchesTab && matchesSearch;
    });
  }, [initialCharacters, activeTab, search]);

  return (
    <div className="space-y-8">
      {/* Controles de Búsqueda y Tabs */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-black/40 p-8 rounded-[2rem] border border-oro/10 backdrop-blur-sm shadow-xl">
        <div className="flex flex-wrap gap-2.5 p-1.5 bg-black/60 border border-oro/10 rounded-2xl">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'voluntary', label: 'Voluntarios' },
            { id: 'inactivity', label: 'Inactividad' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-2.5 rounded-xl text-caption font-black uppercase tracking-[0.2em] transition-all duration-300 ${activeTab === tab.id
                  ? 'bg-oro text-rojo-sangre shadow-md shadow-oro/10 font-black'
                  : 'text-oro/40 hover:text-oro/80'
                }`}
            >
              {tab.label}
              <span className="ml-2 opacity-50">
                ({
                  initialCharacters.filter(c =>
                    tab.id === 'all'
                      ? true
                      : tab.id === 'voluntary'
                        ? c.eliminado_voluntario
                        : !c.eliminado_voluntario
                  ).length
                })
              </span>
            </button>
          ))}
        </div>

        <div className="flex w-full md:w-auto gap-4">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-oro/30" />
            <input
              type="text"
              placeholder="BUSCAR EXPEDIENTE..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/60 border border-oro/15 rounded-xl py-3.5 pl-12 pr-6 text-xs font-bold text-white focus:border-oro outline-none transition-all placeholder:text-oro/20 uppercase tracking-widest"
            />
          </div>
        </div>
      </div>

      {/* Tabla de Fichas Archivadas */}
      <div className="ninja-card-oro overflow-hidden border border-oro/20 bg-black/40 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-oro/10 text-oro/40 text-caption xl:text-xs font-black uppercase tracking-[0.3em]">
                <th className="py-6 px-8 w-24 whitespace-nowrap">Apariencia</th>
                <th className="py-6 px-8 w-[30%] whitespace-nowrap">SHINOBI</th>
                <th className="py-6 px-8 text-center whitespace-nowrap">MOTIVO</th>
                <th className="py-6 px-8 text-center whitespace-nowrap">ARCHIVADO EL</th>
                <th className="py-6 px-8 text-center whitespace-nowrap">TIEMPO LÍMITE</th>
                <th className="py-6 px-8 text-right whitespace-nowrap">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-oro/5">
              {filteredCharacters.map((char) => {
                const daysLeft = getRemainingDays(char);
                const isCritical = daysLeft !== null && daysLeft <= 15;
                const userStr = getUsername(char);

                return (
                  <tr
                    key={char.id}
                    className="group hover:bg-oro/5 transition-all duration-300 relative"
                  >
                    {/* Apariencia */}
                    <td className="py-5 px-8">
                      <div className="w-12 h-12 shrink-0 border border-oro/20 bg-black/40 overflow-hidden flex items-center justify-center ninja-clip-xs">
                        {char.url_img ? (
                          <img
                            src={char.url_img}
                            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                            alt="Avatar"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <User className="w-6 h-6 text-oro/25" />
                        )}
                      </div>
                    </td>

                    {/* Shinobi */}
                    <td className="py-5 px-8">
                      <p className="ninja-title text-xl xl:text-2xl group-hover:text-white transition-colors leading-tight">
                        {char.nombre_ninja}
                      </p>
                      <p className="text-caption text-oro/30 font-black uppercase tracking-widest mt-1 italic whitespace-nowrap">
                        @{userStr}
                      </p>
                      <p className="text-caption text-zinc-500 font-bold mt-0.5 uppercase tracking-wider">
                        {char.rango} {char.rango_jerarquico ? `(${char.rango_jerarquico})` : ''}
                      </p>
                    </td>

                    {/* Motivo */}
                    <td className="py-5 px-8 text-center whitespace-nowrap">
                      <span className={`inline-block px-4 py-1.5 text-caption font-black border uppercase tracking-widest ninja-clip-xs ${char.eliminado_voluntario
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        }`}>
                        {char.eliminado_voluntario ? 'VOLUNTARIO' : 'INACTIVIDAD'}
                      </span>
                    </td>

                    {/* Archivado el */}
                    <td className="py-5 px-8 text-center whitespace-nowrap">
                      <span className="text-xs font-bold text-white/85">
                        {new Date(char.archived_at).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </span>
                    </td>

                    {/* Tiempo límite */}
                    <td className="py-5 px-8 text-center whitespace-nowrap">
                      {daysLeft !== null ? (
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 text-caption font-black border uppercase tracking-wider ninja-clip-xs ${isCritical
                            ? 'bg-rojo-sangre/20 text-rojo-sangre border-rojo-sangre/40 animate-pulse'
                            : 'bg-oro/10 text-oro border-oro/20'
                          }`}>
                          {isCritical ? (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          ) : (
                            <Clock className="w-3.5 h-3.5" />
                          )}
                          {daysLeft > 0
                            ? `Eliminación en ${daysLeft}d`
                            : 'Eliminación programada'}
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-xs font-bold italic">Indefinido</span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="py-5 px-8 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-3">
                        <button
                          onClick={() => handleRestore(char.id, char.nombre_ninja)}
                          disabled={loadingId === char.id}
                          className="flex items-center gap-1.5 px-4 py-2 bg-oro hover:bg-oro/80 text-rojo-sangre text-caption font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 ninja-clip-sm"
                          title="RESTAURAR SHINOBI"
                        >
                          {loadingId === char.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          <span>RESTAURAR</span>
                        </button>

                        <button
                          onClick={() => handleDelete(char.id, char.nombre_ninja)}
                          disabled={loadingId === char.id}
                          className="p-2.5 bg-rojo-sangre/10 border border-rojo-sangre/30 hover:bg-rojo-sangre hover:text-white text-rojo-sangre transition-all active:scale-95 disabled:opacity-50 shrink-0 ninja-clip-sm"
                          title="ELIMINAR DEFINITIVAMENTE"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredCharacters.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <ShieldAlert className="w-12 h-12 text-oro/20 animate-pulse" />
                      <p className="text-oro/40 font-black uppercase italic tracking-[0.3em] text-xs">
                        No hay expedientes archivados en este cuadrante
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
