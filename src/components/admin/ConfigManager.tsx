'use client';

import { useState, useEffect } from 'react';
import { Settings, RefreshCw, ChevronDown, ChevronRight, Plus, Trash2, Save } from 'lucide-react';
import { AdminService } from '@/services/supabase/admin.service';
import { ConfiguracionSistema } from '@/domain/types';
import { useToastStore } from '@/components/ui/Toast';
import { DataField } from '@/components/ui/Fields';

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
      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold text-xs outline-none focus:border-emerald-500 transition-all"
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
              <div key={key} className="flex items-end gap-4 p-4 bg-zinc-900/20 rounded-2xl border border-zinc-900/50 group/prop">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Clave</label>
                  <KeyEditor initialKey={key} onRename={(newK) => onRenameKey(path, key, newK)} />
                </div>
                <div className="flex-[2] space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Valor</label>
                  <input 
                    key={`val-${path.join('-')}-${key}`}
                    type="text"
                    value={val as string | number}
                    onChange={(e) => onChange([...path, key], e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold text-xs outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
                <button 
                  onClick={() => onDeleteProperty(path, key)}
                  className="p-3 text-zinc-700 hover:text-red-500 transition-colors opacity-0 group-hover/prop:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          }

          return (
            <div key={key} className="bg-zinc-900/30 rounded-[2rem] border border-zinc-900 overflow-hidden group/section">
              <div className="w-full flex items-center justify-between p-6 text-left hover:bg-zinc-900/50 transition-colors">
                <button 
                  onClick={() => toggleLocal(key)}
                  className="flex-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/70 text-left"
                >
                  {key.toUpperCase()}
                </button>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => onDeleteProperty(path, key)}
                    className="p-2 text-zinc-700 hover:text-red-500 transition-colors opacity-0 group-hover/section:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => toggleLocal(key)}>
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-zinc-600" /> : <ChevronRight className="w-4 h-4 text-zinc-600" />}
                  </button>
                </div>
              </div>
              
              {isExpanded && (
                <div className="p-6 pt-0 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t border-zinc-900">
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
          className="w-full py-4 border-2 border-dashed border-zinc-900 rounded-[2rem] text-zinc-700 hover:border-emerald-500/30 hover:text-emerald-500 transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"
        >
          <Plus className="w-4 h-4" /> Añadir Propiedad a esta sección
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-6 w-full">
      <div className="flex-1 space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Valor Principal</label>
        <input 
          type="text"
          value={value as string | number}
          onChange={(e) => onChange(path, e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-emerald-500 transition-all"
        />
      </div>
      <button 
        onClick={() => onAddProperty(path)}
        className="px-6 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-500 hover:text-emerald-500 hover:border-emerald-500/30 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
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
      
      // Función auxiliar para renombrar manteniendo el orden
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
      
      // Reemplazamos el objeto que contiene la clave por su versión renombrada
      const parent = updatedValor;
      let target = parent;
      for (let i = 0; i < path.length; i++) {
        target = target[path[i]];
      }
      
      // No, la lógica de navegación anterior era para llegar AL OBJETO que contiene las claves.
      // Re-navegamos correctamente
      let objToModify = updatedValor;
      for (let i = 0; i < path.length; i++) {
        objToModify = objToModify[path[i]];
      }

      const result = renameInObject(objToModify, oldKey, newKey);
      
      // Ahora tenemos que asignar este nuevo objeto de vuelta en su sitio
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
        // Estamos en la raíz
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
        // Convertir valor simple en objeto
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
      // Parsear números antes de enviar
      const parseValue = (val: any): any => {
        if (typeof val === 'object' && val !== null) {
          const newObj: any = {};
          for (const k in val) newObj[k] = parseValue(val[k]);
          return newObj;
        }
        return isNaN(Number(val)) || val === "" ? val : Number(val);
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
      const valor = isNaN(Number(newConfig.valor)) ? newConfig.valor : Number(newConfig.valor);
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
    if (!confirm('¿Estás seguro de eliminar este parámetro?')) return;
    try {
      await AdminService.deleteConfig(id);
      setConfigs(configs.filter(c => c.id !== id));
      addToast(`Parámetro eliminado`, 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const filteredConfigs = configs.filter(c => 
    c.clave.toLowerCase().includes(search.toLowerCase()) || 
    c.titulo.toLowerCase().includes(search.toLowerCase()) ||
    c.descripcion?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 mb-10">
        <div className="relative flex-1">
          <input 
            type="text" 
            placeholder="Buscar configuración..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-900 rounded-[2rem] px-10 py-6 text-white font-bold outline-none focus:border-emerald-500 transition-all placeholder:text-zinc-800"
          />
        </div>
        <button 
          onClick={() => setIsAddingNew(true)}
          className="px-10 py-6 bg-emerald-500 text-black rounded-[2rem] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="w-5 h-5" /> Nuevo Parámetro
        </button>
      </div>

      {isAddingNew && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-[3rem] p-10 mb-10 space-y-8 animate-in zoom-in-95 duration-300">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-emerald-500 uppercase tracking-tighter italic">Crear Nuevo Parámetro</h2>
            <button onClick={() => setIsAddingNew(false)} className="text-zinc-500 hover:text-white transition-colors">Cancelar</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DataField label="Título Humano" value={newConfig.titulo} onChange={v => setNewConfig({...newConfig, titulo: v})} />
            <DataField label="Clave Técnica" value={newConfig.clave} onChange={v => setNewConfig({...newConfig, clave: v})} />
            <div className="md:col-span-2">
              <DataField label="Descripción" value={newConfig.descripcion} onChange={v => setNewConfig({...newConfig, descripcion: v})} />
            </div>
            
            <div className="md:col-span-2 bg-zinc-900/50 p-6 rounded-[2rem] border border-zinc-800/50 space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-500/50">Configuración Inicial</h3>
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
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all border border-emerald-500/20"
                >
                  <Plus className="w-3 h-3" /> Añadir Propiedad / Subsección
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
                  placeholder="Escribe un texto, número o pulsa el botón para crear un objeto..."
                />
              )}
            </div>
          </div>
          <button 
            onClick={handleCreateConfig}
            className="w-full py-6 bg-emerald-500 text-black font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/10"
          >
            Confirmar y Crear Parámetro
          </button>
        </div>
      )}

      <div className="space-y-4">
        {filteredConfigs.map((config) => {
          const isExpanded = expandedKeys[config.id];
          const hasChanges = JSON.stringify(config.valor) !== JSON.stringify(editingValues[config.id]);

          return (
            <div 
              key={config.id} 
              className={`bg-zinc-950 border transition-all overflow-hidden ${isExpanded ? 'border-emerald-500/50 rounded-[3rem]' : 'border-zinc-900 rounded-[2rem] hover:border-zinc-800'}`}
            >
              <div className="w-full flex items-center justify-between p-8 text-left group">
                <button 
                  onClick={() => toggleExpand(config.id)}
                  className="flex flex-1 items-center gap-6"
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isExpanded ? 'bg-emerald-500 text-black' : 'bg-zinc-900 text-zinc-600 group-hover:text-white'}`}>
                    <Settings className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">
                      {config.titulo}
                    </h3>
                    {config.descripcion && (
                      <p className="text-[12px] text-zinc-300 font-black uppercase tracking-widest mt-1 opacity-50">
                        Descripción: {config.descripcion}
                      </p>
                    )}
                  </div>
                </button>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handleDeleteConfig(config.id)}
                    className="p-3 text-zinc-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button onClick={() => toggleExpand(config.id)}>
                    {isExpanded ? <ChevronDown className="w-6 h-6 text-zinc-500" /> : <ChevronRight className="w-6 h-6 text-zinc-500" />}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="p-8 pt-0 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="h-px bg-zinc-900 mb-8" />
                  
                  <div className="flex flex-col gap-8">
                    <div className="flex flex-wrap gap-6">
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
                        className="w-full py-6 bg-emerald-500 text-black rounded-[2rem] font-black uppercase tracking-[0.2em] hover:bg-emerald-400 transition-all flex items-center justify-center gap-4 animate-in slide-in-from-bottom-4 duration-500"
                      >
                        {loadingId === config.id ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                        Confirmar y Guardar Cambios en {config.titulo}
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
