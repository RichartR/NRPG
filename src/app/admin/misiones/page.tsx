'use client';

import { useState, useEffect } from 'react';
import { AdminService } from '@/services/supabase/admin.service';
import { MisionMaster } from '@/domain/types';
import { useToastStore } from '@/components/ui/Toast';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';
import { DataField, SelectField } from '@/components/ui/Fields';
import { ScrollText, Plus, Edit3, Trash2, X, Save, Image as ImageIcon, ChevronLeft, Search, Filter } from 'lucide-react';
import Link from 'next/link';

export default function AdminMisionesPage() {
  const [misiones, setMisiones] = useState<MisionMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMision, setEditingMision] = useState<Partial<MisionMaster> | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRango, setFilterRango] = useState('ALL');
  const addToast = useToastStore(state => state.addToast);
  const { confirm: confirmAction } = useConfirmStore();

  useEffect(() => {
    fetchMisiones();
  }, []);

  const fetchMisiones = async () => {
    setLoading(true);
    try {
      const data = await AdminService.getMisiones();
      setMisiones(data);
    } catch (err) {
      console.error(err);
      addToast('Error al cargar las misiones', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingMision?.codigo_mision || !editingMision?.rango) {
      addToast('El código y el rango son obligatorios', 'error');
      return;
    }

    setSaving(true);
    try {
      await AdminService.saveMision(editingMision);
      addToast('Misión guardada correctamente', 'success');
      setEditingMision(null);
      fetchMisiones();
    } catch (err) {
      console.error(err);
      addToast('Error al guardar la misión', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirmAction({
      title: 'Eliminar Misión',
      message: '¿Estás seguro de que quieres eliminar esta misión maestra?',
      variant: 'danger',
      requireValidation: true
    });
    if (!ok) return;

    try {
      await AdminService.deleteMision(id);
      addToast('Misión eliminada', 'success');
      fetchMisiones();
    } catch (err) {
      console.error(err);
      addToast('Error al eliminar la misión', 'error');
    }
  };

  const rangos = ['D', 'C', 'B', 'A', 'S'];

  return (
    <div className="max-w-[1750px]">
      <header className="mb-16 ninja-card-oro p-8 xl:p-10">
        <Link href="/admin" className="flex items-center gap-3 text-oro/40 hover:text-oro transition-all mb-8 text-[10px] font-black uppercase tracking-[0.3em] group">
          <div className="w-1.5 h-1.5 bg-oro/20 group-hover:bg-oro rotate-45 transition-colors" />
          VOLVER AL PANEL CENTRAL
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-oro/[0.03] border border-oro/10 flex items-center justify-center">
              <ScrollText className="w-6 h-6 text-oro" />
            </div>
            <div>
              <h1 className="ninja-title text-4xl xl:text-5xl italic">TABLÓN DE MISIONES</h1>
              <p className="text-oro/40 text-[10px] xl:text-xs font-black uppercase tracking-[0.4em] mt-2">CONFIGURACIÓN DE ENCARGOS Y RECOMPENSAS</p>
            </div>
          </div>

          <button 
            onClick={() => setEditingMision({ rango: 'D', exp: 0, ryous: 0 })}
            className="flex items-center gap-4 px-10 py-5 bg-rojo-sangre hover:brightness-125 text-oro font-black text-[10px] xl:text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-rojo-sangre/20 active:scale-95"
            style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
          >
            <Plus className="w-4 h-4" />
            NUEVA MISIÓN MAESTRA
          </button>
        </div>
      </header>

        {editingMision && (
          <div className="mb-12 p-8 xl:p-12 bg-[#0A0A0A]/60 border border-oro/10 backdrop-blur-md relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500" style={{ clipPath: 'polygon(30px 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%, 0 30px)' }}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-oro/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black uppercase italic text-white">
                {editingMision.id ? 'Editar Misión' : 'Nueva Misión'}
              </h3>
              <button onClick={() => setEditingMision(null)} className="p-2 text-zinc-500 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <DataField 
                label="Código de Misión" 
                value={editingMision.codigo_mision || ''} 
                onChange={(v) => setEditingMision({ ...editingMision, codigo_mision: v })} 
                placeholder="Ej: M-001"
              />
              <SelectField 
                label="Rango" 
                value={editingMision.rango || 'D'} 
                options={rangos} 
                onChange={(v) => setEditingMision({ ...editingMision, rango: v })} 
              />
              <DataField 
                label="Recompensa XP" 
                type="number"
                value={editingMision.exp || 0} 
                onChange={(v) => setEditingMision({ ...editingMision, exp: Number(v) })} 
              />
              <DataField 
                label="Recompensa Ryous" 
                type="number"
                value={editingMision.ryous || 0} 
                onChange={(v) => setEditingMision({ ...editingMision, ryous: Number(v) })} 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <DataField 
                label="Imagen Frontal (URL)" 
                value={editingMision.imagen_frontal || ''} 
                onChange={(v) => setEditingMision({ ...editingMision, imagen_frontal: v })} 
                placeholder="https://..."
              />
              <DataField 
                label="Imagen Trasera (URL)" 
                value={editingMision.imagen_trasera || ''} 
                onChange={(v) => setEditingMision({ ...editingMision, imagen_trasera: v })} 
                placeholder="https://..."
              />
            </div>

            <button 
              onClick={handleSave}
              disabled={saving}
              className="w-full py-5 bg-oro text-rojo-sangre font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-4 shadow-xl shadow-oro/5"
              style={{ clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)' }}
            >
              <Save className="w-4 h-4" />
              {saving ? 'PROCESANDO...' : 'GUARDAR CONFIGURACIÓN DE MISIÓN'}
            </button>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-oro/30" />
            <input 
              type="text"
              placeholder="FILTRAR POR CÓDIGO DE MISIÓN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0A0A0A]/40 border border-oro/10 py-5 pl-16 pr-8 text-[10px] xl:text-xs font-black text-oro outline-none focus:border-oro/40 transition-all placeholder:text-oro/20 uppercase tracking-widest"
              style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
            />
          </div>
          <div className="flex items-center gap-4 px-8 bg-[#0A0A0A]/40 border border-oro/10" style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}>
            <Filter className="w-4 h-4 text-oro/30" />
            <select 
              value={filterRango}
              onChange={(e) => setFilterRango(e.target.value)}
              className="bg-transparent py-5 text-[10px] xl:text-xs font-black uppercase tracking-widest text-oro/60 outline-none cursor-pointer appearance-none pr-4"
            >
              <option value="ALL">TODOS LOS RANGOS</option>
              {rangos.map(r => <option key={r} value={r}>RANGO {r}</option>)}
            </select>
          </div>
        </div>

        <div className="ninja-card-oro overflow-hidden">
          {loading ? (
            <div className="p-20 text-center">
              <div className="w-10 h-10 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto" />
            </div>
          ) : misiones.filter(m => {
            const matchesSearch = m.codigo_mision.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRango = filterRango === 'ALL' || m.rango === filterRango;
            return matchesSearch && matchesRango;
          }).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-black/20 border-b border-oro/5">
                    <th className="px-10 py-8 text-left text-[10px] font-black text-oro/40 uppercase tracking-[0.4em]">EXPEDIENTE</th>
                    <th className="px-10 py-8 text-left text-[10px] font-black text-oro/40 uppercase tracking-[0.4em]">RANGO SOCIAL</th>
                    <th className="px-10 py-8 text-left text-[10px] font-black text-oro/40 uppercase tracking-[0.4em]">RECOMPENSA ESTIMADA</th>
                    <th className="px-10 py-8 text-left text-[10px] font-black text-oro/40 uppercase tracking-[0.4em]">ARCHIVOS VISUALES</th>
                    <th className="px-10 py-8 text-right text-[10px] font-black text-oro/40 uppercase tracking-[0.4em]">PROTOCOLOS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {misiones.filter(m => {
                    const matchesSearch = m.codigo_mision.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesRango = filterRango === 'ALL' || m.rango === filterRango;
                    return matchesSearch && matchesRango;
                  }).map((m) => (
                    <tr key={m.id} className="hover:bg-zinc-800/30 transition-colors group">
                      <td className="px-8 py-6">
                        <span className="font-black text-white italic">{m.codigo_mision}</span>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${
                          m.rango === 'S' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                          m.rango === 'A' ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' :
                          m.rango === 'B' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' :
                          m.rango === 'C' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                          'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'
                        }`}>
                          Rango {m.rango}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold text-blue-400">+{m.exp} XP</span>
                          <span className="text-xs font-bold text-emerald-400">+{m.ryous} ¥</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex gap-2">
                          {m.imagen_frontal ? (
                            <div className="w-8 h-8 rounded-lg overflow-hidden border border-zinc-800 group-hover:border-zinc-700">
                              <img src={m.imagen_frontal} alt="Front" className="w-full h-full object-cover" />
                            </div>
                          ) : <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center"><ImageIcon className="w-3 h-3 text-zinc-800" /></div>}
                          {m.imagen_trasera ? (
                            <div className="w-8 h-8 rounded-lg overflow-hidden border border-zinc-800 group-hover:border-zinc-700">
                              <img src={m.imagen_trasera} alt="Back" className="w-full h-full object-cover" />
                            </div>
                          ) : <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center"><ImageIcon className="w-3 h-3 text-zinc-800" /></div>}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => { setEditingMision(m); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            className="p-3 bg-zinc-800 rounded-xl text-zinc-400 hover:bg-white hover:text-black transition-all"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(m.id)}
                            className="p-3 bg-zinc-800 rounded-xl text-zinc-400 hover:bg-red-500 hover:text-white transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-20 text-center">
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs italic">No hay misiones configuradas</p>
            </div>
          )}
        </div>
    </div>
  );
}
