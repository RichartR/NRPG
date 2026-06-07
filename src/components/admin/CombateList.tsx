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
    <div className="space-y-6">
      <button 
        onClick={startAdding}
        className="w-full py-8 bg-neutral-800/40 border-2 border-dashed border-oro/20 hover:border-oro/50 hover:bg-oro/5 text-oro/40 hover:text-oro transition-all font-black uppercase tracking-[0.4em] text-xs flex items-center justify-center gap-4 group ninja-clip-md"
      >
        <Plus className="w-5 h-5 group-hover:scale-125 transition-transform" /> 
        Añadir Protocolo de Combate
      </button>

      {(isAdding || editingId) && (
        <div 
          className="bg-neutral-800/60 border border-oro/10 p-10 shadow-2xl space-y-6 animate-in slide-in-from-top-4 duration-500 relative overflow-hidden ninja-clip-lg"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-oro/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
          
          <div className="flex items-center justify-between border-b border-oro/10 pb-8">
            <h3 className="text-2xl font-black text-oro uppercase italic tracking-tighter flex items-center gap-4">
              <Sword className="w-8 h-8 text-rojo-sangre" />
              {isAdding ? 'Nueva Configuración de Combate' : 'Modificar Registro'}
            </h3>
            <button onClick={() => {setEditingId(null); setIsAdding(false);}} className="text-oro/30 hover:text-oro transition-colors">
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
            <label className="text-caption font-black uppercase tracking-widest text-oro/30 ml-2">Descripción Técnica</label>
            <textarea 
              value={editForm.descripcion} 
              onChange={e => setEditForm({...editForm, descripcion: e.target.value})} 
              rows={3} 
              className="w-full bg-black/40 border border-oro/10 p-8 text-oro font-bold outline-none focus:border-oro/40 transition-all resize-none placeholder:text-oro/10 text-sm ninja-clip-md"
              placeholder="Detalla los efectos y condiciones de la técnica..."
            />
          </div>

          <div className="flex justify-end gap-6 pt-10 border-t border-oro/10">
            <button onClick={() => {setEditingId(null); setIsAdding(false);}} className="text-caption font-black uppercase tracking-widest text-oro/40 hover:text-oro transition-all">Cancelar Operación</button>
            <button 
              onClick={handleSave} 
              disabled={loading} 
              className="px-12 py-5 bg-oro text-rojo-sangre font-black text-xs uppercase tracking-widest flex items-center gap-4 transition-all shadow-2xl shadow-oro/10 active:scale-95 disabled:opacity-50 hover:brightness-110"
              style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Finalizar Registro
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {docs.map((doc) => (
          <div 
            key={doc.id} 
            className="group flex items-center justify-between p-8 bg-neutral-800/40 border border-oro/5 hover:border-oro/20 backdrop-blur-sm transition-all relative overflow-hidden"
            style={{ clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)' }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-oro/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-oro/10 transition-all duration-500 pointer-events-none" />
            
            <div className="flex items-center gap-8 relative z-10">
              <div 
                className="w-16 h-16 bg-black/40 border border-oro/10 flex items-center justify-center shrink-0 group-hover:border-oro/30 transition-all"
                style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
              >
                <Sword className="w-6 h-6 text-oro/30 group-hover:text-oro group-hover:scale-110 transition-all" />
              </div>
              <div>
                <div className="flex items-center gap-4 mb-2 flex-wrap">
                  <h4 className="text-xl font-black text-oro uppercase italic tracking-tighter leading-none">{doc.titulo}</h4>
                  <div className="flex items-center gap-2">
                    <span 
                      className="text-caption font-black bg-oro/5 border border-oro/10 px-3 py-1 text-oro/60 uppercase tracking-widest ninja-clip-sm"
                    >
                      {doc.ramas_clanes?.nombre || 'General'}
                    </span>
                    {doc.sub_especialidades?.nombre && (
                      <span 
                        className="text-caption font-black bg-rojo-sangre/10 border border-rojo-sangre/20 px-3 py-1 text-oro uppercase tracking-widest ninja-clip-sm"
                      >
                        {doc.sub_especialidades.nombre}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-oro/40 text-xs italic mt-1 line-clamp-1">{doc.descripcion || 'Sin descripción táctica registrada.'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 relative z-10">
              <button 
                onClick={() => startEditing(doc)} 
                className="p-4 bg-oro text-rojo-sangre hover:brightness-110 transition-all active:scale-[0.98] shadow-lg shadow-oro/10"
                style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button 
                onClick={() => deleteDoc(doc.id)} 
                className="p-4 bg-rojo-sangre/10 text-rojo-sangre rounded-2xl hover:bg-rojo-sangre hover:text-oro transition-all active:scale-90 border border-rojo-sangre/20"
                style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}

        {docs.length === 0 && (
          <div 
            className="py-24 text-center bg-neutral-800/40 border border-oro/5 backdrop-blur-md ninja-clip-lg"
          >
            <p className="text-oro/10 font-black uppercase italic tracking-[0.3em] text-xs">Arsenal vacío</p>
          </div>
        )}
      </div>
    </div>
  );
}
