'use client';

import { useState, useEffect } from 'react';
import { AdminService } from '@/services/supabase/admin.service';
import { EstadoCombate } from '@/domain/types';
import { useToastStore } from '@/components/ui/Toast';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';
import { DataField } from '@/components/ui/Fields';
import { Swords, Plus, Edit3, Trash2, X, Save, ChevronLeft, Search, Filter, CheckCircle2, Archive } from 'lucide-react';
import Link from 'next/link';

export default function AdminEstadosCombatePage() {
  const [estados, setEstados] = useState<EstadoCombate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEstado, setEditingEstado] = useState<Partial<EstadoCombate> | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const addToast = useToastStore(state => state.addToast);
  const { confirm: confirmAction } = useConfirmStore();

  useEffect(() => {
    fetchEstados();
  }, []);

  const fetchEstados = async () => {
    setLoading(true);
    try {
      const data = await AdminService.getEstadosCombate();
      setEstados(data);
    } catch (err) {
      console.error(err);
      addToast('Error al cargar los estados', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingEstado?.nombre) {
      addToast('El nombre del estado es obligatorio', 'error');
      return;
    }

    setSaving(true);
    try {
      await AdminService.saveEstadoCombate(editingEstado);
      addToast('Estado guardado correctamente', 'success');
      setEditingEstado(null);
      fetchEstados();
    } catch (err) {
      console.error(err);
      addToast('Error al guardar el estado', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirmAction({
      title: 'Eliminar Estado',
      message: '¿Estás seguro de que quieres eliminar este estado definitivamente?',
      variant: 'danger',
      requireValidation: true
    });
    if (!ok) return;

    try {
      await AdminService.deleteEstadoCombate(id);
      addToast('Estado eliminado', 'success');
      fetchEstados();
    } catch (err) {
      console.error(err);
      addToast('Error al eliminar el estado', 'error');
    }
  };

  const toggleStatus = async (estado: EstadoCombate) => {
    try {
      await AdminService.saveEstadoCombate({ ...estado, activo: !estado.activo });
      addToast(`Estado ${estado.activo ? 'archivado' : 'activado'}`, 'success');
      fetchEstados();
    } catch (err) {
      console.error(err);
      addToast('Error al cambiar el estado', 'error');
    }
  };

  const filteredEstados = estados.filter(est => {
    const matchesSearch = est.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'active' ? est.activo : !est.activo;
    return matchesSearch && matchesTab;
  });

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
                <Swords className="w-10 h-10 text-red-500" />
                ESTADOS DE <span className="text-red-500">COMBATE</span>
              </h1>
              <p className="text-zinc-500 text-sm font-medium mt-2 uppercase tracking-widest">Gestiona los estados post-combate (Herido, Muerto, etc.).</p>
            </div>
            <button 
              onClick={() => setEditingEstado({ nombre: '', activo: true })}
              className="flex items-center gap-2 px-8 py-4 bg-red-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-500 transition-all shadow-xl shadow-red-500/20"
            >
              <Plus className="w-4 h-4" /> Nuevo Estado
            </button>
          </div>
        </header>

        {editingEstado && (
          <div className="mb-12 p-8 bg-zinc-900 border border-zinc-800 rounded-[2.5rem] animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black uppercase italic text-white">
                {editingEstado.id ? 'Editar Estado' : 'Nuevo Estado'}
              </h3>
              <button onClick={() => setEditingEstado(null)} className="p-2 text-zinc-500 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <DataField 
                label="Nombre del Estado" 
                value={editingEstado.nombre || ''} 
                onChange={(v) => setEditingEstado({ ...editingEstado, nombre: v })} 
                placeholder="Ej: Herido Grave"
              />
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Estado de Visibilidad</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setEditingEstado({ ...editingEstado, activo: true })}
                    className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${editingEstado.activo ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' : 'bg-zinc-950 border-zinc-800 text-zinc-600'}`}
                  >
                    Activo
                  </button>
                  <button 
                    onClick={() => setEditingEstado({ ...editingEstado, activo: false })}
                    className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${!editingEstado.activo ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-600'}`}
                  >
                    Archivado
                  </button>
                </div>
              </div>
            </div>

            <button 
              onClick={handleSave}
              disabled={saving}
              className="w-full py-5 bg-white text-black font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-red-500 hover:text-white transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-2xl shadow-white/5"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar Estado'}
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center bg-zinc-900/30 p-8 rounded-[2.5rem] border border-zinc-800/50 backdrop-blur-md mb-8">
          <div className="flex gap-3 p-1.5 bg-black border border-zinc-800 rounded-[1.5rem]">
            {(['active', 'archived'] as const).map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                  activeTab === tab 
                  ? 'bg-red-600 text-white shadow-xl shadow-red-900/20' 
                  : 'text-zinc-500 hover:text-white'
                }`}
              >
                {tab === 'active' ? 'Activos' : 'Archivados'} 
                <span className="ml-2 opacity-40">({estados.filter(e => tab === 'active' ? e.activo : !e.activo).length})</span>
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input 
              type="text"
              placeholder="BUSCAR ESTADO..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-2xl py-4 pl-12 pr-6 text-xs font-bold text-white focus:border-red-500 outline-none transition-all placeholder:text-zinc-700"
            />
          </div>
        </div>

        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/50">
          {loading ? (
            <div className="p-20 text-center">
              <div className="w-10 h-10 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin mx-auto" />
            </div>
          ) : filteredEstados.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/50">
                    <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nombre del Estado</th>
                    <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Estatus</th>
                    <th className="px-8 py-6 text-right text-[10px] font-black text-zinc-500 uppercase tracking-widest">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filteredEstados.map((est) => (
                    <tr key={est.id} className="hover:bg-zinc-800/30 transition-colors group">
                      <td className="px-8 py-6">
                        <span className={`text-sm font-black uppercase italic ${est.activo ? 'text-white' : 'text-zinc-600'}`}>{est.nombre}</span>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border inline-flex items-center gap-2 ${
                          est.activo 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                          : 'bg-zinc-900 border-zinc-800 text-zinc-600'
                        }`}>
                          {est.activo ? <CheckCircle2 className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
                          {est.activo ? 'Activo' : 'Archivado'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => toggleStatus(est)}
                            title={est.activo ? 'Archivar' : 'Activar'}
                            className={`p-3 rounded-xl transition-all ${
                              est.activo 
                              ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white' 
                              : 'bg-emerald-600 text-black hover:bg-emerald-500'
                            }`}
                          >
                            {est.activo ? <Archive className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={() => { setEditingEstado(est); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            className="p-3 bg-zinc-800 rounded-xl text-zinc-400 hover:bg-white hover:text-black transition-all"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(est.id)}
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
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs italic">No se encontraron estados</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
