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
    <div className="min-h-screen bg-black pt-24 pb-20 px-4 md:px-10">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <Link href="/admin" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-4 text-xs font-black uppercase tracking-widest group">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver al panel
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase italic flex items-center gap-4">
                <ScrollText className="w-10 h-10 text-orange-500" />
                GESTIÓN DE <span className="text-orange-500">MISIONES</span>
              </h1>
              <p className="text-zinc-500 text-sm font-medium mt-2 uppercase tracking-widest">Configura las misiones maestras del sistema.</p>
            </div>
            <button 
              onClick={() => setEditingMision({ rango: 'D', exp: 0, ryous: 0 })}
              className="flex items-center gap-2 px-8 py-4 bg-orange-600 text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-orange-500 transition-all shadow-xl shadow-orange-500/20"
            >
              <Plus className="w-4 h-4" /> Nueva Misión
            </button>
          </div>
        </header>

        {editingMision && (
          <div className="mb-12 p-8 bg-zinc-900 border border-zinc-800 rounded-[2.5rem] animate-in fade-in slide-in-from-top-4 duration-500">
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
              className="w-full py-5 bg-white text-black font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-orange-500 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input 
              type="text"
              placeholder="Buscar por código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:border-orange-500/50 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-2 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
            <Filter className="w-4 h-4 text-zinc-600" />
            <select 
              value={filterRango}
              onChange={(e) => setFilterRango(e.target.value)}
              className="bg-transparent py-4 text-xs font-black uppercase tracking-widest text-zinc-400 outline-none cursor-pointer"
            >
              <option value="ALL">Todos los Rangos</option>
              {rangos.map(r => <option key={r} value={r}>Rango {r}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-[2.5rem] overflow-hidden">
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
                  <tr className="border-b border-zinc-800 bg-zinc-900/50">
                    <th className="px-8 py-6 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest">Código</th>
                    <th className="px-8 py-6 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest">Rango</th>
                    <th className="px-8 py-6 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest">Recompensa</th>
                    <th className="px-8 py-6 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest">Imágenes</th>
                    <th className="px-8 py-6 text-right text-[10px] font-black text-zinc-500 uppercase tracking-widest">Acciones</th>
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
    </div>
  );
}
