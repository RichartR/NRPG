'use client';

import { useState, useEffect } from 'react';
import { AdminService } from '@/services/supabase/admin.service';
import { EstadoCombate } from '@/domain/types';
import { useToastStore } from '@/components/ui/Toast';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';
import { DataField } from '@/components/ui/Fields';
import { Swords, Plus, Edit3, Trash2, X, Save, Search, CheckCircle2, Archive } from 'lucide-react';
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
    <div className="max-w-[1750px]">
      <header className="mb-6 ninja-card-oro p-8 xl:p-10">
        <Link href="/admin" className="flex items-center gap-3 text-oro/40 hover:text-oro transition-all mb-8 text-[10px] font-black uppercase tracking-[0.3em] group">
          <div className="w-1.5 h-1.5 bg-oro/20 group-hover:bg-oro rotate-45 transition-colors" />
          VOLVER AL PANEL CENTRAL
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-rojo-sangre/[0.03] border border-rojo-sangre/10 flex items-center justify-center">
              <Swords className="w-6 h-6 text-rojo-sangre" />
            </div>
            <div>
              <h1 className="ninja-title text-4xl xl:text-5xl italic">ESTADOS CRÍTICOS</h1>
              <p className="text-oro/40 text-[10px] xl:text-xs font-black uppercase tracking-[0.4em] mt-2">CONFIGURACIÓN DE CONDICIONES POST-COMBATE</p>
            </div>
          </div>

          <button
            onClick={() => setEditingEstado({ nombre: '', activo: true })}
            className="flex items-center gap-4 px-10 py-5 bg-rojo-sangre hover:brightness-125 text-oro font-black text-[10px] xl:text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-rojo-sangre/20 active:scale-95"
            style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
          >
            <Plus className="w-4 h-4" />
            NUEVO ESTADO CRÍTICO
          </button>
        </div>
      </header>

      {editingEstado && (
        <div className="mb-12 p-8 xl:p-12 bg-[#0A0A0A]/60 border border-oro/10 backdrop-blur-md relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500" style={{ clipPath: 'polygon(30px 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%, 0 30px)' }}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-oro/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
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
            className="w-full py-5 bg-oro text-rojo-sangre font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-4 shadow-xl shadow-oro/5"
            style={{ clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)' }}
          >
            <Save className="w-4 h-4" />
            {saving ? 'PROCESANDO...' : 'GUARDAR CONFIGURACIÓN DE ESTADO'}
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8 justify-between items-start lg:items-center bg-[#0A0A0A]/40 p-10 xl:p-12 border border-oro/5 backdrop-blur-md mb-8">
        <div className="flex gap-4 p-2 bg-black/40 border border-oro/10">
          {(['active', 'archived'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-10 py-4 font-black uppercase tracking-[0.2em] transition-all text-[10px] xl:text-xs ${activeTab === tab
                  ? 'bg-oro text-rojo-sangre shadow-lg'
                  : 'text-oro/40 hover:text-oro hover:bg-oro/5'
                }`}
              style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
            >
              {tab === 'active' ? 'ACTIVOS' : 'ARCHIVADOS'}
              <span className={`ml-3 opacity-40 ${activeTab === tab ? 'text-rojo-sangre/60' : ''}`}>({estados.filter(e => tab === 'active' ? e.activo : !e.activo).length})</span>
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-oro/30" />
          <input
            type="text"
            placeholder="BUSCAR ESTADO..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/20 border border-oro/10 py-5 pl-16 pr-8 text-[10px] xl:text-xs font-black text-oro outline-none focus:border-oro/40 transition-all placeholder:text-oro/20 uppercase tracking-widest"
            style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
          />
        </div>
      </div>

      <div className="ninja-card-oro overflow-hidden">
        {loading ? (
          <div className="p-20 text-center">
            <div className="w-10 h-10 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredEstados.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-black/20 border-b border-oro/5">
                  <th className="px-10 py-8 text-[10px] font-black text-oro/40 uppercase tracking-[0.4em]">NOMBRE DEL ESTADO CRÍTICO</th>
                  <th className="px-10 py-8 text-[10px] font-black text-oro/40 uppercase tracking-[0.4em]">ESTATUS</th>
                  <th className="px-10 py-8 text-right text-[10px] font-black text-oro/40 uppercase tracking-[0.4em]">PROTOCOLOS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredEstados.map((est) => (
                  <tr key={est.id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-8 py-6">
                      <span className={`text-sm font-black uppercase italic ${est.activo ? 'text-white' : 'text-zinc-600'}`}>{est.nombre}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border inline-flex items-center gap-2 ${est.activo
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
                          className={`p-3 rounded-xl transition-all ${est.activo
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
  );
}
