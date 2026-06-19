'use client';

import { useState, useEffect } from 'react';
import { Settings, RefreshCw, ChevronDown, ChevronRight, Plus, Trash2, Save } from 'lucide-react';
import { AdminService } from '@/services/supabase/admin.service';
import { ConfiguracionSistema } from '@/domain/types';
import { useToastStore } from '@/components/ui/Toast';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';
import { DataField } from '@/components/ui/Fields';
import { searchAny } from '@/lib/utils/search';

function KeyEditor({ initialKey, onRename }: { initialKey: string, onRename: (newKey: string) => void }) {
  const [localKey, setLocalKey] = useState(initialKey);

  useEffect(() => {
    setLocalKey(initialKey);
  }, [initialKey]);

  return (
    <input 
      type="text"
      value={localKey}
      onChange={(e) => setLocalKey(e.target.value)}
      onBlur={() => {
        if (localKey !== initialKey && localKey.trim() !== "") {
          onRename(localKey.trim());
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
      }}
      className="w-full bg-black/40 border border-oro/10 px-4 py-3 text-oro font-black text-xs outline-none focus:border-oro/40 transition-all uppercase tracking-widest"
      style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
    />
  );
}

interface ConfigEditorProps {
  path: string[];
  value: any;
  onChange: (path: string[], newValue: any) => void;
  onRenameKey: (path: string[], oldKey: string, newKey: string) => void;
  onAddProperty: (path: string[]) => void;
  onDeleteProperty: (path: string[], key: string) => void;
}

function ConfigEditor({ path, value, onChange, onRenameKey, onAddProperty, onDeleteProperty }: ConfigEditorProps) {
  const [localExpanded, setLocalExpanded] = useState<Record<string, boolean>>({});
  const isObject = value && typeof value === 'object' && !Array.isArray(value);

  const toggleLocal = (key: string) => {
    setLocalExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (isObject) {
    return (
      <div className="space-y-4 w-full">
        {Object.entries(value).map(([key, val]) => {
          const isNestedObject = val && typeof val === 'object' && !Array.isArray(val);
          const isExpanded = localExpanded[key];

          if (!isNestedObject) {
            return (
              <div 
                key={key} 
                className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4 p-4 bg-black/40 border border-oro/5 group/prop relative"
                style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
              >
                <div className="flex-1 space-y-2">
                  <label className="text-caption font-black uppercase tracking-widest text-oro/30 ml-1">Clave</label>
                  <KeyEditor initialKey={key} onRename={(newK) => onRenameKey(path, key, newK)} />
                </div>
                <div className="flex-[2] space-y-2">
                  <label className="text-caption font-black uppercase tracking-widest text-oro/30 ml-1">Valor</label>
                  <input 
                    key={`val-${path.join('-')}-${key}`}
                    type="text"
                    value={val as string | number}
                    onChange={(e) => onChange([...path, key], e.target.value)}
                    className="w-full bg-black/40 border border-oro/10 px-4 py-3 text-oro font-black text-xs outline-none focus:border-oro/40 transition-all"
                    style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                  />
                </div>
                <button 
                  onClick={() => onDeleteProperty(path, key)}
                  className="p-3 text-oro/30 hover:text-rojo-sangre transition-colors self-end"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          }

          return (
            <div 
              key={key} 
              className="bg-black/30 border border-oro/10 overflow-hidden group/section relative"
              style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
            >
              <div className="w-full flex items-center justify-between p-5 text-left hover:bg-oro/5 transition-colors">
                <button 
                  onClick={() => toggleLocal(key)}
                  className="flex-1 text-caption font-black uppercase tracking-[0.2em] text-oro/70 text-left hover:text-oro"
                >
                  {key.toUpperCase()}
                </button>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => onDeleteProperty(path, key)}
                    className="p-2 text-oro/30 hover:text-rojo-sangre transition-colors opacity-0 group-hover/section:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => toggleLocal(key)} className="p-2">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-oro/50" /> : <ChevronRight className="w-4 h-4 text-oro/50" />}
                  </button>
                </div>
              </div>
              
              {isExpanded && (
                <div className="p-6 pt-0 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-1 gap-6 pt-4 border-t border-oro/10">
                    <ConfigEditor 
                      path={[...path, key]}
                      value={val}
                      onChange={onChange}
                      onRenameKey={onRenameKey}
                      onAddProperty={onAddProperty}
                      onDeleteProperty={onDeleteProperty}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
        
        <button 
          onClick={() => onAddProperty(path)}
          className="w-full py-4 border border-dashed border-oro/20 text-oro/40 hover:border-oro/60 hover:text-oro transition-all flex items-center justify-center gap-2 text-caption font-black uppercase tracking-widest bg-black/10"
          style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
        >
          <Plus className="w-4 h-4" /> Añadir Propiedad a esta sección
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-6 w-full">
      <div className="flex-1 space-y-2">
        <label className="text-caption font-black uppercase tracking-widest text-oro/30 ml-1">Valor Principal</label>
        <input 
          type="text"
          value={value as string | number}
          onChange={(e) => onChange(path, e.target.value)}
          className="w-full bg-black/40 border border-oro/10 px-6 py-4 text-oro font-bold outline-none focus:border-oro/40 transition-all"
          style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
        />
      </div>
      <button 
        onClick={() => onAddProperty(path)}
        className="px-6 py-4 bg-black/40 border border-oro/10 text-oro/60 hover:text-oro hover:border-oro/30 transition-all flex items-center justify-center gap-2 text-caption font-black uppercase tracking-widest"
        style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
        title="Convertir en sección y añadir sub-propiedad"
      >
        <Plus className="w-4 h-4" /> Crear Subsección
      </button>
    </div>
  );
}

export default function ConfigManager({ initialConfigs }: { initialConfigs: ConfiguracionSistema[] }) {
  const [configs, setConfigs] = useState(initialConfigs);
  const [search, setSearch] = useState('');
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Record<number, boolean>>({});
  const [editingValues, setEditingValues] = useState<Record<number, any>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newConfig, setNewConfig] = useState<{ clave: string, titulo: string, descripcion: string, valor: any }>({ 
    clave: '', 
    titulo: '', 
    descripcion: '', 
    valor: '' 
  });
  const addToast = useToastStore(state => state.addToast);
  const { confirm: confirmAction } = useConfirmStore();

  const toggleExpand = (id: number) => {
    const config = configs.find(c => c.id === id);
    if (!expandedKeys[id] && config) {
      setEditingValues(prev => ({ ...prev, [id]: JSON.parse(JSON.stringify(config.valor)) }));
    }
    setExpandedKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleValueChange = (id: number, path: string[], newValue: any) => {
    setEditingValues(prev => {
      const updatedValor = JSON.parse(JSON.stringify(prev[id]));
      
      if (path.length === 0) return { ...prev, [id]: newValue };
      
      let current = updatedValor;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }

      current[path[path.length - 1]] = newValue;
      return { ...prev, [id]: updatedValor };
    });
  };

  const handleRenameKey = (id: number, path: string[], oldKey: string, newKey: string) => {
    setEditingValues(prev => {
      const updatedValor = JSON.parse(JSON.stringify(prev[id]));
      
      const renameInObject = (obj: any, oldK: string, newK: string) => {
        const newObj: any = {};
        Object.keys(obj).forEach(k => {
          if (k === oldK) newObj[newK] = obj[oldK];
          else newObj[k] = obj[k];
        });
        return newObj;
      };

      if (path.length === 0) {
        return { ...prev, [id]: renameInObject(updatedValor, oldKey, newKey) };
      }

      let current = updatedValor;
      for (let i = 0; i < path.length; i++) {
        current = current[path[i]];
      }
      
      let objToModify = updatedValor;
      for (let i = 0; i < path.length; i++) {
        objToModify = objToModify[path[i]];
      }

      const result = renameInObject(objToModify, oldKey, newKey);
      
      if (path.length === 0) return { ...prev, [id]: result };
      
      let setter = updatedValor;
      for (let i = 0; i < path.length - 1; i++) {
        setter = setter[path[i]];
      }
      setter[path[path.length - 1]] = result;

      return { ...prev, [id]: updatedValor };
    });
  };

  const handleAddProperty = (id: number, path: string[]) => {
    setEditingValues(prev => {
      const updatedValor = JSON.parse(JSON.stringify(prev[id] ?? ""));
      
      if (path.length === 0) {
        let newRoot = typeof updatedValor === 'object' && updatedValor !== null ? updatedValor : { valor_original: updatedValor };
        newRoot[`propiedad_${Date.now().toString().slice(-4)}`] = "";
        return { ...prev, [id]: newRoot };
      }

      let current = updatedValor;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }

      const lastKey = path[path.length - 1];
      if (typeof current[lastKey] !== 'object' || current[lastKey] === null) {
        current[lastKey] = { valor_original: current[lastKey] };
      }
      
      current[lastKey][`propiedad_${Date.now().toString().slice(-4)}`] = "";
      return { ...prev, [id]: updatedValor };
    });
  };

  const handleDeleteProperty = (id: number, path: string[], keyToDelete: string) => {
    setEditingValues(prev => {
      const updatedValor = JSON.parse(JSON.stringify(prev[id]));
      let current = updatedValor;
      for (let i = 0; i < path.length; i++) {
        current = current[path[i]];
      }
      delete current[keyToDelete];
      return { ...prev, [id]: updatedValor };
    });
  };

  const handleSave = async (id: number) => {
    setLoadingId(id);
    try {
      const isLargeNumericString = (val: any): boolean => {
        if (typeof val !== 'string') return false;
        return /^\d{15,}$/.test(val);
      };

      const parseValue = (val: any): any => {
        if (typeof val === 'object' && val !== null) {
          const newObj: any = {};
          for (const k in val) newObj[k] = parseValue(val[k]);
          return newObj;
        }
        return isNaN(Number(val)) || val === "" || isLargeNumericString(val) ? val : Number(val);
      };

      const finalValue = parseValue(editingValues[id]);
      const data = await AdminService.updateConfig(id, finalValue);
      setConfigs(prev => prev.map(c => c.id === id ? data : c));
      addToast(`Cambios guardados con éxito`, 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const handleCreateConfig = async () => {
    if (!newConfig.clave || !newConfig.titulo) return;
    try {
      const isLargeNumericString = (val: any): boolean => {
        if (typeof val !== 'string') return false;
        return /^\d{15,}$/.test(val);
      };

      const valor = isNaN(Number(newConfig.valor)) || isLargeNumericString(newConfig.valor) ? newConfig.valor : Number(newConfig.valor);
      const data = await AdminService.createConfig(newConfig.clave, newConfig.titulo, valor, newConfig.descripcion);
      setConfigs([data, ...configs]);
      setIsAddingNew(false);
      setNewConfig({ clave: '', titulo: '', descripcion: '', valor: '' });
      addToast(`Parámetro creado`, 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleDeleteConfig = async (id: number) => {
    const ok = await confirmAction({
      title: 'Eliminar Parámetro',
      message: '¿Estás seguro de eliminar este parámetro?',
      variant: 'danger',
      requireValidation: true
    });
    if (!ok) return;
    try {
      await AdminService.deleteConfig(id);
      setConfigs(configs.filter(c => c.id !== id));
      addToast(`Parámetro eliminado`, 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const filteredConfigs = configs.filter(c => searchAny(search, [c.clave, c.titulo, c.descripcion]));

  return (
    <div className="space-y-6">
      {/* Controles Superiores */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-6 justify-between items-stretch sm:items-center bg-neutral-800/40 p-6 sm:p-10 border border-oro/5 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-oro/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

        <div className="relative flex-1 min-w-[280px]">
          <input 
            type="text" 
            placeholder="BUSCAR CONFIGURACIÓN..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/20 border border-oro/10 py-3.5 pl-6 pr-6 text-caption sm:text-caption xl:text-xs font-black text-oro focus:border-oro/40 outline-none transition-all placeholder:text-oro/20 uppercase tracking-widest"
            style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
          />
        </div>

        <button 
          onClick={() => setIsAddingNew(true)}
          className="flex items-center justify-center gap-3 px-10 py-3.5 bg-rojo-sangre hover:brightness-125 text-oro font-black text-caption sm:text-caption xl:text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-rojo-sangre/20 active:scale-95 whitespace-nowrap"
          style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
        >
          <Plus className="w-5 h-5 shrink-0" /> NUEVO PARÁMETRO
        </button>
      </div>

      {isAddingNew && (
        <div className="ninja-card-oro p-8 xl:p-10 space-y-8 animate-in zoom-in-95 duration-300 relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-oro/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
          <div className="flex justify-between items-center border-b border-oro/10 pb-4">
            <h2 className="text-xl font-black text-oro uppercase tracking-[0.1em] italic">Crear Nuevo Parámetro</h2>
            <button onClick={() => setIsAddingNew(false)} className="text-oro/40 hover:text-oro transition-colors font-black text-caption uppercase tracking-wider">Cancelar</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DataField label="Título Humano" value={newConfig.titulo} onChange={v => setNewConfig({...newConfig, titulo: v})} />
            <DataField label="Clave Técnica" value={newConfig.clave} onChange={v => setNewConfig({...newConfig, clave: v})} />
            <div className="md:col-span-2">
              <DataField label="Descripción" value={newConfig.descripcion} onChange={v => setNewConfig({...newConfig, descripcion: v})} />
            </div>
            
            <div className="md:col-span-2 bg-black/40 p-6 border border-oro/5 space-y-4" style={{ clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)' }}>
              <div className="flex justify-between items-center mb-4 border-b border-oro/5 pb-2">
                <h3 className="text-caption font-black uppercase tracking-widest text-oro/40">Configuración Inicial</h3>
                <button 
                  onClick={() => {
                    const currentVal = newConfig.valor;
                    const newVal = typeof currentVal === 'object' && currentVal !== null 
                      ? currentVal 
                      : { valor: currentVal || "" };
                    setNewConfig({
                      ...newConfig,
                      valor: { ...newVal, [`nueva_propiedad_${Date.now().toString().slice(-4)}`]: "" }
                    });
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-oro/10 text-oro border border-oro/20 text-caption font-black uppercase tracking-widest hover:bg-oro hover:text-rojo-sangre transition-all"
                  style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                >
                  <Plus className="w-3 h-3" /> Añadir Propiedad
                </button>
              </div>

              {typeof newConfig.valor === 'object' && newConfig.valor !== null ? (
                <div className="space-y-4">
                  <ConfigEditor 
                    path={[]}
                    value={newConfig.valor}
                    onChange={(path, val) => {
                      const updated = JSON.parse(JSON.stringify(newConfig.valor));
                      
                      if (path.length === 1) {
                        updated[path[0]] = val;
                        setNewConfig({ ...newConfig, valor: updated });
                        return;
                      }

                      let curr = updated;
                      for (let i = 0; i < path.length - 1; i++) curr = curr[path[i]];
                      curr[path[path.length - 1]] = val;
                      setNewConfig({ ...newConfig, valor: updated });
                    }}
                    onRenameKey={(path, old, key) => {
                      const updated = JSON.parse(JSON.stringify(newConfig.valor));
                      
                      const renameInObject = (obj: any, oldK: string, newK: string) => {
                        const newObj: any = {};
                        Object.keys(obj).forEach(k => {
                          if (k === oldK) newObj[newK] = obj[oldK];
                          else newObj[k] = obj[k];
                        });
                        return newObj;
                      };

                      if (path.length === 0) {
                        setNewConfig({ ...newConfig, valor: renameInObject(updated, old, key) });
                        return;
                      }

                      let curr = updated;
                      for (let i = 0; i < path.length - 1; i++) curr = curr[path[i]];
                      
                      const lastKey = path[path.length - 1];
                      const result = renameInObject(curr[lastKey], old, key);
                      curr[lastKey] = result;
                      
                      setNewConfig({ ...newConfig, valor: updated });
                    }}
                    onAddProperty={(path) => {
                      const updated = JSON.parse(JSON.stringify(newConfig.valor));
                      let curr = updated;
                      for (let i = 0; i < path.length; i++) curr = curr[path[i]];
                      curr[`propiedad_${Date.now().toString().slice(-4)}`] = "";
                      setNewConfig({ ...newConfig, valor: updated });
                    }}
                    onDeleteProperty={(path, key) => {
                      const updated = JSON.parse(JSON.stringify(newConfig.valor));
                      let curr = updated;
                      for (let i = 0; i < path.length; i++) curr = curr[path[i]];
                      delete curr[key];
                      setNewConfig({ ...newConfig, valor: updated });
                    }}
                  />
                </div>
              ) : (
                <DataField 
                  label="Valor Inicial (Simple)" 
                  value={newConfig.valor as string} 
                  onChange={v => setNewConfig({...newConfig, valor: v})} 
                  placeholder="Escribe un valor simple o añade una propiedad arriba para estructurar como JSON..."
                />
              )}
            </div>
          </div>
          <button 
            onClick={handleCreateConfig}
            className="w-full py-5 bg-oro text-rojo-sangre font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all shadow-lg active:scale-[0.98]"
            style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
          >
            Confirmar y Crear Parámetro
          </button>
        </div>
      )}

      {/* Lista de configuraciones */}
      <div className="space-y-4">
        {filteredConfigs.map((config) => {
          const isExpanded = expandedKeys[config.id];
          const hasChanges = JSON.stringify(config.valor) !== JSON.stringify(editingValues[config.id]);

          return (
            <div 
              key={config.id} 
              className={`border transition-all overflow-hidden bg-black/40 backdrop-blur-sm relative ${isExpanded ? 'border-oro/40' : 'border-oro/10 hover:border-oro/30'}`}
              style={{ clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)' }}
            >
              <div className="w-full flex items-center justify-between p-6 sm:p-8 text-left group">
                <button 
                  onClick={() => toggleExpand(config.id)}
                  className="flex flex-1 items-center gap-6 text-left"
                >
                  <div className={`w-12 h-12 flex items-center justify-center transition-all border ${isExpanded ? 'bg-oro border-oro text-rojo-sangre' : 'bg-black/40 border-oro/10 text-oro/40 group-hover:text-oro'}`} style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}>
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-oro uppercase tracking-tight italic">
                      {config.titulo}
                    </h3>
                    {config.descripcion && (
                      <p className="text-[11px] text-oro/40 font-black uppercase tracking-widest mt-1">
                        Descripción: {config.descripcion}
                      </p>
                    )}
                  </div>
                </button>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handleDeleteConfig(config.id)}
                    className="p-3 text-oro/30 hover:text-rojo-sangre transition-colors opacity-0 group-hover:opacity-100"
                    title="Eliminar"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button onClick={() => toggleExpand(config.id)} className="p-2">
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-oro/40" /> : <ChevronRight className="w-5 h-5 text-oro/40" />}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="p-6 sm:p-8 pt-0 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="h-px bg-oro/10 mb-6" />
                  
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-wrap gap-6 bg-black/20 p-6 border border-oro/5" style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}>
                      <ConfigEditor 
                        path={[]}
                        value={editingValues[config.id]}
                        onChange={(path, val) => handleValueChange(config.id, path, val)}
                        onRenameKey={(path, old, key) => handleRenameKey(config.id, path, old, key)}
                        onAddProperty={(path) => handleAddProperty(config.id, path)}
                        onDeleteProperty={(path, key) => handleDeleteProperty(config.id, path, key)}
                      />
                    </div>

                    {hasChanges && (
                      <button 
                        onClick={() => handleSave(config.id)}
                        disabled={loadingId === config.id}
                        className="w-full py-5 bg-rojo-sangre hover:brightness-125 text-oro font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-4 animate-in slide-in-from-bottom-4 duration-500 shadow-xl shadow-rojo-sangre/15"
                        style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
                      >
                        {loadingId === config.id ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Confirmar y Guardar Cambios
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
