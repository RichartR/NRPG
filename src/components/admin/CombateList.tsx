'use client';

import { useState } from 'react';
import { Edit2, Save, X, Sword, Plus, Trash2, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AdminService } from '@/services/supabase/admin.service';
import { useToastStore } from '@/components/ui/Toast';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';
import { DataField, SelectField } from '@/components/ui/Fields';

export default function CombateList({ 
  initialDocs, 
  ramas, 
  subEspecialidades 
}: { 
  initialDocs: any[], 
  ramas: any[], 
  subEspecialidades: any[] 
}) {
  const [docs, setDocs] = useState(initialDocs);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const addToast = useToastStore(state => state.addToast);
  const { confirm: confirmAction } = useConfirmStore();

  const startAdding = () => {
    setEditForm({
      titulo: '',
      clave: '',
      descripcion: '',
      url_drive: '',
      rama_id: '',
      sub_especialidad_id: '',
      activo: true
    });
    setIsAdding(true);
    setEditingId(null);
  };

  const startEditing = (doc: any) => {
    setEditingId(doc.id);
    setEditForm({ ...doc });
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (!editForm) return;
    setLoading(true);

    try {
      const { ramas_clanes, sub_especialidades, ...cleanForm } = editForm;
      const payload = {
        ...cleanForm,
        rama_id: editForm.rama_id || null,
        sub_especialidad_id: editForm.sub_especialidad_id || null
      };

      const data = await AdminService.saveCombatDoc(payload);
      
      if (isAdding) {
        setDocs([data, ...docs]);
      } else {
        setDocs(docs.map(d => d.id === data.id ? data : d));
      }

      addToast("Registro de combate guardado", "success");
      setEditingId(null);
      setEditForm(null);
      setIsAdding(false);
      router.refresh();
    } catch (err: any) {
      addToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const deleteDoc = async (id: number) => {
    const ok = await confirmAction({
      title: 'Eliminar Protocolo',
      message: '¿Seguro que quieres borrar este registro?',
      variant: 'danger',
      requireValidation: true
    });
    if (!ok) return;
    try {
      await AdminService.deleteCombatDoc(id);
      setDocs(docs.filter(d => d.id !== id));
      addToast("Registro eliminado", "success");
      router.refresh();
    } catch (err: any) {
      addToast(err.message, "error");
    }
  };

  const subFiltradas = subEspecialidades.filter(s => s.rama_id === parseInt(editForm?.rama_id));

  return (
    <div className="space-y-10">
      <button 
        onClick={startAdding}
        className="w-full py-8 border-2 border-dashed border-zinc-900 rounded-[3rem] text-zinc-600 hover:text-red-500 hover:border-red-500/50 hover:bg-red-500/5 transition-all font-black uppercase tracking-[0.4em] text-xs flex items-center justify-center gap-4 group"
      >
        <Plus className="w-5 h-5 group-hover:scale-125 transition-transform" /> 
        Añadir Protocolo de Combate
      </button>

      {(isAdding || editingId) && (
        <div className="bg-zinc-950 border border-red-900/30 rounded-[3rem] p-10 shadow-2xl space-y-10 animate-in slide-in-from-top-4 duration-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
          
          <div className="flex items-center justify-between border-b border-zinc-900 pb-8">
            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-4">
              <Sword className="w-8 h-8 text-red-500" />
              {isAdding ? 'Nueva Configuración de Combate' : 'Modificar Registro'}
            </h3>
            <button onClick={() => {setEditingId(null); setIsAdding(false);}} className="text-zinc-600 hover:text-white transition-colors">
              <X className="w-8 h-8" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <DataField 
              label="Título de la Técnica" 
              value={editForm.titulo} 
              onChange={v => {
                setEditForm({
                  ...editForm, 
                  titulo: v,
                  clave: v.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
                });
              }} 
            />
            <DataField label="Clave Operativa" value={editForm.clave} onChange={v => setEditForm({...editForm, clave: v})} />
            
            <SelectField 
              label="Rama de Origen" 
              value={editForm.rama_id} 
              options={ramas.map(r => ({ label: r.nombre, value: r.id }))} 
              onChange={v => setEditForm({...editForm, rama_id: v, sub_especialidad_id: ''})} 
            />
            <SelectField 
              label="Sub-Especialidad Táctica" 
              value={editForm.sub_especialidad_id} 
              options={subFiltradas.map(s => ({ label: s.nombre, value: s.id }))} 
              onChange={v => setEditForm({...editForm, sub_especialidad_id: v})} 
            />
          </div>

          <DataField label="URL del Manual (Drive)" value={editForm.url_drive} onChange={v => setEditForm({...editForm, url_drive: v})} />

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Descripción Técnica</label>
            <textarea 
              value={editForm.descripcion} 
              onChange={e => setEditForm({...editForm, descripcion: e.target.value})} 
              rows={3} 
              className="w-full bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 text-white font-bold outline-none focus:border-red-500 transition-all resize-none placeholder:text-zinc-800" 
              placeholder="Detalla los efectos y condiciones de la técnica..."
            />
          </div>

          <div className="flex justify-end gap-6 pt-10 border-t border-zinc-900">
            <button onClick={() => {setEditingId(null); setIsAdding(false);}} className="text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white">Cancelar Operación</button>
            <button 
              onClick={handleSave} 
              disabled={loading} 
              className="px-12 py-5 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-4 transition-all shadow-2xl shadow-white/5 active:scale-95 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Finalizar Registro
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {docs.map((doc) => (
          <div key={doc.id} className="group flex items-center justify-between p-8 bg-zinc-950 border border-zinc-900 rounded-[2.5rem] hover:border-red-500/30 transition-all relative overflow-hidden">
            <div className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/[0.02] transition-colors" />
            
            <div className="flex items-center gap-8 relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 group-hover:bg-red-500/10 group-hover:border-red-500/20 transition-all">
                <Sword className="w-6 h-6 text-zinc-700 group-hover:text-red-500 group-hover:scale-110 transition-all" />
              </div>
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <h4 className="text-xl font-black text-white uppercase italic tracking-tighter">{doc.titulo}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full text-zinc-500 uppercase tracking-widest">
                      {doc.ramas_clanes?.nombre || 'General'}
                    </span>
                    {doc.sub_especialidades?.nombre && (
                      <span className="text-[8px] font-black bg-red-500/5 border border-red-500/10 px-3 py-1 rounded-full text-red-500/70 uppercase tracking-widest">
                        {doc.sub_especialidades.nombre}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-zinc-500 text-xs italic line-clamp-1">{doc.descripcion || 'Sin descripción táctica registrada.'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 relative z-10">
              <button 
                onClick={() => startEditing(doc)} 
                className="p-4 bg-zinc-900 text-white rounded-2xl hover:bg-white hover:text-black transition-all active:scale-90"
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button 
                onClick={() => deleteDoc(doc.id)} 
                className="p-4 bg-red-600/10 text-red-500 rounded-2xl hover:bg-red-600 hover:text-white transition-all active:scale-90 border border-red-600/20"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}

        {docs.length === 0 && (
          <div className="py-24 text-center bg-zinc-950/50 rounded-[3rem] border-2 border-dashed border-zinc-900">
            <p className="text-zinc-700 font-black uppercase italic tracking-[0.3em] text-sm">Arsenal vacío</p>
          </div>
        )}
      </div>
    </div>
  );
}
