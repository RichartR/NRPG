'use client';

import { useState, useMemo } from 'react';
import { Edit2, Eye, EyeOff, GitBranch, MapPin, Search, PlusCircle, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import RamaEditForm from './RamaEditForm';
import { AdminService } from '@/services/supabase/admin.service';
import { useToastStore } from '@/components/ui/Toast';

export default function RamaList({ initialRamas, aldeas, rasgos }: { initialRamas: any[], aldeas: any[], rasgos: any[] }) {
  const [editingRama, setEditingRama] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [search, setSearch] = useState('');
  const [loadingId, setLoadingId] = useState<number | null>(null);
  
  const router = useRouter();
  const addToast = useToastStore(state => state.addToast);

  const toggleActive = async (id: number, currentStatus: boolean) => {
    setLoadingId(id);
    try {
      await AdminService.saveRamaClan({ id, activo: !currentStatus });
      addToast(`Registro ${!currentStatus ? 'activado' : 'archivado'}`, 'success');
      router.refresh();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const filteredRamas = useMemo(() => {
    return initialRamas.filter(rama => {
      const matchesTab = activeTab === 'active' ? rama.activo : !rama.activo;
      const matchesSearch = 
        rama.nombre.toLowerCase().includes(search.toLowerCase()) || 
        rama.tipo.toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [initialRamas, activeTab, search]);

  return (
    <div className="space-y-6">
      {/* Controles Superiores */}
      <div className="flex flex-col min-[1600px]:flex-row flex-wrap gap-6 justify-between items-stretch min-[1600px]:items-center bg-neutral-800/40 p-6 sm:p-10 xl:p-12 border border-oro/5 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-oro/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

        <div className="flex gap-2 p-1.5 bg-black/40 border border-oro/10 ninja-box w-full min-[1600px]:w-auto justify-center">
          {['active', 'inactive'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 sm:flex-initial text-center px-4 sm:px-10 py-3 xl:py-4 font-black uppercase tracking-[0.2em] transition-all text-caption sm:text-caption xl:text-xs ${
                activeTab === tab 
                ? 'bg-oro text-rojo-sangre shadow-lg' 
                : 'text-oro/40 hover:text-oro hover:bg-oro/5'
              }`}
              style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
            >
              {tab === 'active' ? 'ACTIVOS' : 'ARCHIVADOS'} 
              <span className={`ml-2 opacity-40 ${activeTab === tab ? 'text-rojo-sangre/60' : ''}`}>({initialRamas.filter(r => tab === 'active' ? r.activo : !r.activo).length})</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap w-full min-[1600px]:w-auto gap-4 sm:gap-6 items-stretch sm:items-center">
          <div className="relative flex-1 sm:w-64 lg:w-72 xl:w-80">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-oro/40" />
            <input 
              type="text" 
              placeholder="BUSCAR RAMA O CLAN..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/20 border border-oro/10 py-3 xl:py-4 pl-14 pr-8 text-caption sm:text-caption xl:text-xs font-black text-oro focus:border-oro/40 outline-none transition-all placeholder:text-oro/20 uppercase tracking-widest"
              style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
            />
          </div>
          
          <button 
            onClick={() => setIsAdding(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 sm:px-10 py-3 xl:py-4 bg-rojo-sangre hover:brightness-125 text-oro font-black text-caption sm:text-caption xl:text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-rojo-sangre/20 active:scale-95 whitespace-nowrap"
            style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
          >
            <PlusCircle className="w-5 h-5 shrink-0" />
            NUEVA RAMA/CLAN
          </button>
        </div>
      </div>

      {/* Listado */}
      <div className="ninja-card-oro overflow-hidden border border-oro/10 bg-black/40 backdrop-blur-sm">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[800px] table-fixed">
            <thead>
              <tr className="border-b border-oro/10 text-oro/70 text-caption xl:text-xs font-black uppercase tracking-[0.3em] bg-black/20">
                <th className="py-6 px-8 w-[10%]">Símbolo</th>
                <th className="py-6 px-8 w-[35%]">Nombre</th>
                <th className="py-6 px-8 w-[15%]">Tipo</th>
                <th className="py-6 px-8 w-[15%]">Afiliación</th>
                <th className="py-6 px-8 w-[15%]">Slug</th>
                <th className="py-6 px-8 text-right w-[10%]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-oro/5 bg-black/40">
              {filteredRamas.map((rama) => (
                <tr key={rama.id} className="hover:bg-oro/5 transition-colors group">
                  {/* Símbolo */}
                  <td className="py-5 px-8">
                    <div 
                      className={`w-12 h-12 bg-black/40 flex items-center justify-center border overflow-hidden shrink-0 transition-colors duration-300 ninja-clip-xs ${
                        rama.activo ? 'border-oro/10' : 'border-oro/5'
                      }`}
                    >
                      {rama.url_imagen ? (
                        <img src={rama.url_imagen} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                      ) : (
                        <GitBranch className="w-5 h-5 text-oro/30 group-hover:text-oro transition-colors" />
                      )}
                    </div>
                  </td>

                  {/* Nombre */}
                  <td className="py-5 px-8">
                    <h3 className="text-base font-black text-oro uppercase italic tracking-tighter leading-none">{rama.nombre}</h3>
                  </td>

                  {/* Tipo */}
                  <td className="py-5 px-8">
                    <span 
                      className="px-3 py-1 text-caption font-black bg-rojo-sangre text-oro uppercase tracking-widest leading-none inline-block ninja-clip-xs"
                    >
                      {rama.tipo.toUpperCase()}
                    </span>
                  </td>

                  {/* Afiliación */}
                  <td className="py-5 px-8">
                    {rama.aldeas ? (
                      <span 
                        className="flex items-center gap-1.5 text-caption text-oro font-black uppercase tracking-widest bg-oro/5 border border-oro/10 px-3 py-1 w-fit ninja-clip-xs"
                      >
                        <MapPin className="w-2.5 h-2.5 text-oro/60" /> {rama.aldeas.abreviatura || rama.aldeas.nombre_jap}
                      </span>
                    ) : (
                      <span 
                        className="flex items-center gap-1.5 text-caption text-oro/40 font-black uppercase tracking-widest bg-black/20 border border-oro/5 px-3 py-1 w-fit ninja-clip-xs"
                      >
                        <MapPin className="w-2.5 h-2.5 opacity-30" /> GLOBAL
                      </span>
                    )}
                  </td>

                  {/* Slug */}
                  <td className="py-5 px-8">
                    <span 
                      className="px-3 py-1 bg-oro/5 border border-oro/10 text-caption font-black text-oro/60 uppercase tracking-widest font-mono italic inline-block ninja-clip-xs"
                    >
                      /{rama.slug}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="py-5 px-8 text-right">
                    <div className="flex items-center justify-end gap-2.5">
                      <button 
                        onClick={() => toggleActive(rama.id, rama.activo)}
                        disabled={loadingId === rama.id}
                        className={`p-2.5 transition-all border ninja-clip-xs ${
                          rama.activo 
                            ? 'bg-oro/10 border-oro/20 text-oro hover:bg-oro hover:text-rojo-sangre' 
                            : 'bg-black/40 border-oro/5 text-oro/20 hover:border-oro/40 hover:text-oro'
                        }`}
                        title={rama.activo ? "Archivar Registro" : "Activar Registro"}
                      >
                        {loadingId === rama.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : (rama.activo ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />)}
                      </button>
                      <button 
                        onClick={() => setEditingRama(rama)}
                        className="p-2.5 bg-oro text-rojo-sangre hover:brightness-110 transition-all active:scale-95 shadow-lg shadow-oro/10 ninja-clip-xs"
                        title="Editar Registro"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredRamas.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-24 text-center">
                    <p className="text-oro/10 font-black uppercase italic tracking-[0.3em] text-xs">Sin resultados tácticos</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(editingRama || isAdding) && (
        <RamaEditForm 
          rama={editingRama} 
          aldeas={aldeas}
          rasgos={rasgos}
          onCancel={() => {
            setEditingRama(null);
            setIsAdding(false);
          }} 
        />
      )}
    </div>
  );
}
