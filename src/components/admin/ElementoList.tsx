'use client';

import { useState, useMemo } from 'react';
import { Edit2, Eye, EyeOff, Flame, Search, PlusCircle, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ElementoEditForm from './ElementoEditForm';
import { AdminService } from '@/services/supabase/admin.service';
import { useToastStore } from '@/components/ui/Toast';
import { Elemento, RamaClan, SubEspecialidad, RamaElemento } from '@/domain/types';

interface ElementoListProps {
  initialElementos: Elemento[];
  ramas: RamaClan[];
  subEspecialidades: SubEspecialidad[];
  ramaElementos: RamaElemento[];
}

export default function ElementoList({ initialElementos, ramas, subEspecialidades, ramaElementos }: ElementoListProps) {
  const [editingElemento, setEditingElemento] = useState<Elemento | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [activeType, setActiveType] = useState<'todos' | 'basico' | 'avanzado'>('todos');
  const [search, setSearch] = useState('');
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const router = useRouter();
  const addToast = useToastStore((s) => s.addToast);

  const toggleActive = async (id: number, currentStatus: boolean) => {
    setLoadingId(id);
    try {
      await AdminService.saveElemento({ id, activo: !currentStatus });
      addToast(`Elemento ${!currentStatus ? 'activado' : 'archivado'}`, 'success');
      router.refresh();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const filtered = useMemo(() => {
    return initialElementos.filter((el) => {
      const matchesTab = activeTab === 'active' ? el.activo : !el.activo;
      const matchesType = activeType === 'todos' || el.tipo === activeType;
      const matchesSearch =
        el.nombre_esp.toLowerCase().includes(search.toLowerCase()) ||
        el.nombre_jap.toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesType && matchesSearch;
    });
  }, [initialElementos, activeTab, activeType, search]);

  // Vinculaciones del elemento en edición
  const editingVinculaciones = editingElemento
    ? ramaElementos.filter((re) => re.elemento_id === editingElemento.id)
    : [];

  return (
    <div className="space-y-6">
      {/* Controles Superiores */}
      <div className="flex flex-col min-[1600px]:flex-row flex-wrap gap-6 justify-between items-stretch min-[1600px]:items-center bg-[#0A0A0A]/40 p-6 sm:p-10 xl:p-12 border border-oro/5 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-oro/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

        {/* Tabs Activo/Archivado */}
        <div className="flex gap-2 p-1.5 bg-black/40 border border-oro/10 ninja-box w-full min-[1600px]:w-auto justify-center">
          {(['active', 'inactive'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 sm:flex-initial text-center px-4 sm:px-8 py-3 xl:py-4 font-black uppercase tracking-[0.2em] transition-all text-[9px] sm:text-[10px] xl:text-xs ${activeTab === tab ? 'bg-oro text-rojo-sangre shadow-lg' : 'text-oro/40 hover:text-oro hover:bg-oro/5'}`}
              style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
            >
              {tab === 'active' ? 'ACTIVOS' : 'ARCHIVADOS'}{' '}
              <span className={`ml-2 opacity-40 ${activeTab === tab ? 'text-rojo-sangre/60' : ''}`}>
                ({initialElementos.filter((e) => (tab === 'active' ? e.activo : !e.activo)).length})
              </span>
            </button>
          ))}
        </div>

        {/* Filtro tipo + búsqueda + botón nuevo */}
        <div className="flex flex-col sm:flex-row flex-wrap w-full min-[1600px]:w-auto gap-4 sm:gap-6 items-stretch sm:items-center">
          {/* Filtro tipo */}
          <div className="flex gap-1 p-1 bg-black/40 border border-oro/10">
            {(['todos', 'basico', 'avanzado'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveType(t)}
                className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${activeType === t ? 'bg-oro/20 text-oro border border-oro/30' : 'text-oro/30 hover:text-oro'}`}
              >
                {t === 'todos' ? 'Todos' : t === 'basico' ? 'Básicos' : 'Avanzados'}
              </button>
            ))}
          </div>

          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-oro/40" />
            <input
              type="text"
              placeholder="BUSCAR ELEMENTO..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/20 border border-oro/10 py-3 xl:py-4 pl-12 pr-6 text-[9px] sm:text-[10px] xl:text-xs font-black text-oro focus:border-oro/40 outline-none transition-all placeholder:text-oro/20 uppercase tracking-widest"
              style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
            />
          </div>

          <button
            onClick={() => setIsAdding(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 sm:px-10 py-3 xl:py-4 bg-rojo-sangre hover:brightness-125 text-oro font-black text-[9px] sm:text-[10px] xl:text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-rojo-sangre/20 active:scale-95 whitespace-nowrap"
            style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
          >
            <PlusCircle className="w-5 h-5 shrink-0" />
            NUEVO ELEMENTO
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="ninja-card-oro overflow-hidden border border-oro/10 bg-black/40 backdrop-blur-sm">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[700px] table-fixed">
            <thead>
              <tr className="border-b border-oro/10 text-oro/70 text-[10px] xl:text-xs font-black uppercase tracking-[0.3em] bg-black/20">
                <th className="py-6 px-8 w-[12%]">Icono</th>
                <th className="py-6 px-8 w-[28%]">Nombre ESP</th>
                <th className="py-6 px-8 w-[28%]">Nombre JAP</th>
                <th className="py-6 px-8 w-[16%]">Tipo</th>
                <th className="py-6 px-8 text-right w-[16%]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-oro/5 bg-black/40">
              {filtered.map((el) => (
                <tr key={el.id} className="hover:bg-oro/5 transition-colors group">
                  {/* Icono */}
                  <td className="py-5 px-8">
                    <div className="w-12 h-12 bg-black/40 flex items-center justify-center border border-oro/10 overflow-hidden shrink-0 ninja-clip-xs">
                      {el.url_icono ? (
                        <img src={el.url_icono} alt="" className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                      ) : (
                        <Flame className="w-5 h-5 text-oro/30 group-hover:text-oro transition-colors" />
                      )}
                    </div>
                  </td>

                  {/* Nombre ESP */}
                  <td className="py-5 px-8">
                    <h3 className="text-base font-black text-oro uppercase italic tracking-tighter leading-none">{el.nombre_esp}</h3>
                  </td>

                  {/* Nombre JAP */}
                  <td className="py-5 px-8">
                    <span className="text-sm font-black text-oro/60 tracking-wider">{el.nombre_jap}</span>
                  </td>

                  {/* Tipo */}
                  <td className="py-5 px-8">
                    <span className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest inline-block ninja-clip-xs ${el.tipo === 'basico' ? 'bg-rojo-sangre text-oro' : 'bg-oro/10 border border-oro/30 text-oro'}`}>
                      {el.tipo === 'basico' ? 'BÁSICO' : 'AVANZADO'}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="py-5 px-8 text-right">
                    <div className="flex items-center justify-end gap-2.5">
                      <button
                        onClick={() => toggleActive(el.id, el.activo)}
                        disabled={loadingId === el.id}
                        className={`p-2.5 transition-all border ninja-clip-xs ${el.activo ? 'bg-oro/10 border-oro/20 text-oro hover:bg-oro hover:text-rojo-sangre' : 'bg-black/40 border-oro/5 text-oro/20 hover:border-oro/40 hover:text-oro'}`}
                        title={el.activo ? 'Archivar' : 'Activar'}
                      >
                        {loadingId === el.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : el.activo ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => setEditingElemento(el)}
                        className="p-2.5 bg-oro text-rojo-sangre hover:brightness-110 transition-all active:scale-95 shadow-lg shadow-oro/10 ninja-clip-xs"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <p className="text-oro/10 font-black uppercase italic tracking-[0.3em] text-xs">Sin elementos registrados</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal crear/editar */}
      {(editingElemento || isAdding) && (
        <ElementoEditForm
          elemento={editingElemento ?? undefined}
          ramas={ramas}
          subEspecialidades={subEspecialidades}
          vinculaciones={editingVinculaciones}
          onCancel={() => {
            setEditingElemento(null);
            setIsAdding(false);
          }}
        />
      )}
    </div>
  );
}
