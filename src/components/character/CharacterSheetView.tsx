'use client';

import { 
  User, Shield, Briefcase, Zap, Save, RefreshCw, ArrowLeft, 
  Activity, Sword, ScrollText, GitBranch, UserCircle, X, Heart, Trash2
} from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import { DataField, SelectField } from '@/components/ui/Fields';
import { CharacterStats } from '@/domain/types';

interface CharacterSheetViewProps {
  character: any;
  masters: any;
  isEditing: boolean;
  canEdit: boolean;
  activeTab: string;
  saving: boolean;
  isNew?: boolean;
  onUpdateField: (field: string, value: any) => void;
  onUpdateStat: (stat: keyof CharacterStats, value: number) => void;
  onSave: (section?: string) => void;
  onCancel: () => void;
  onSetActiveTab: (tab: string) => void;
  onBack: () => void;
  setIsEditing?: (val: boolean) => void;
}

export function CharacterSheetView({
  character,
  masters,
  isEditing,
  canEdit,
  activeTab,
  saving,
  isNew = false,
  onUpdateField,
  onUpdateStat,
  onSave,
  onCancel,
  onSetActiveTab,
  onBack,
  setIsEditing
}: CharacterSheetViewProps) {
  
  const puntosGastados = Object.values(character.stats_base || {}).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0);
  const puntosLibres = (Number(character.puntos_stats) || 0) - puntosGastados;
  const aldeaObj = masters.aldeas.find((a: any) => a.id === character.aldea_id);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans selection:bg-orange-500/30">
      <header className="sticky top-0 z-50 bg-zinc-950/80 border-b border-zinc-800/50 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={onBack} className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-all active:scale-95">
              <ArrowLeft className="w-5 h-5 text-zinc-400" />
            </button>
            <div>
              <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none mb-1">
                {character.nombre_ninja || (isNew ? 'Nuevo Shinobi' : '')}
              </h1>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{character.rango_jerarquico}</span>
                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{aldeaObj?.nombre_completo || character.aldeas?.nombre_completo || 'Sin Aldea'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {!isNew && canEdit && (
              <button 
                onClick={() => isEditing ? onCancel() : setIsEditing?.(true)} 
                className={`flex items-center gap-3 px-6 py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all active:scale-95 border ${isEditing ? 'bg-zinc-100 text-black border-white' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'}`}
              >
                {isEditing ? <X className="w-4 h-4" /> : <Edit3Icon className="w-4 h-4" />}
                {isEditing ? 'Cancelar' : 'Editar Ficha'}
              </button>
            )}
            {(isEditing || isNew) && (
              <button onClick={() => onSave()} disabled={saving} className={`flex items-center gap-3 px-8 py-4 ${isNew ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-orange-600 shadow-orange-500/20'} hover:opacity-90 text-black rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95 disabled:opacity-50`}>
                <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} /> 
                {isNew ? 'Inicializar Personaje' : 'Guardar Cambios'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        <div className="flex gap-3 mb-12 overflow-x-auto pb-4 scrollbar-hide">
          {['general', 'ninja', 'inventario', 'tecnicas', 'onrol'].map((tab) => (
            <button 
              key={tab} 
              onClick={() => onSetActiveTab(tab)} 
              className={`px-10 py-4 rounded-[2rem] text-[11px] font-black uppercase tracking-widest transition-all border ${activeTab === tab ? 'bg-white text-black border-white shadow-xl shadow-white/5' : 'bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:border-zinc-700'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'general' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
              <SectionCard title="Información Básica" icon={User} color="emerald">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <DataField 
                      label="Usuario de Discord (Player)" 
                      value={
                        Array.isArray(character.profiles) 
                          ? character.profiles[0]?.username 
                          : character.profiles?.username || (isNew ? 'Cargando...' : 'No vinculado')
                      } 
                      disabled={true} 
                    />
                    <DataField label="Nombre en Hobba" value={character.hobba_name} disabled={!isEditing && !isNew} onChange={(v)=>onUpdateField('hobba_name', v)} />
                    <DataField label="Tiempo en el RPG" value={character.tiempo_rpg} disabled={!isEditing && !isNew} onChange={(v)=>onUpdateField('tiempo_rpg', v)} />
                  </div>
              </SectionCard>

              <SectionCard title="Información de Personaje" icon={UserCircle} color="blue">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DataField label="Nombre Ninja" value={character.nombre_ninja} disabled={!isEditing && !isNew} onChange={(v)=>onUpdateField('nombre_ninja', v)} />
                    <SelectField 
                      label="Aldea" 
                      value={character.aldea_id} 
                      options={masters.aldeas.map((a:any)=>({label:a.nombre_completo, value:a.id}))} 
                      disabled={!isEditing && !isNew} 
                      placeholder="Sin aldea"
                      onChange={(v)=>onUpdateField('aldea_id', v ? Number(v) : null)} 
                    />
                    <DataField label="Rango" value={`Rango ${character.rango}`} disabled={true} />
                    <DataField label="Rango Jerárquico" value={character.rango_jerarquico} disabled={!isEditing && !isNew} onChange={(v)=>onUpdateField('rango_jerarquico', v)} />
                  </div>
              </SectionCard>

              <SectionCard title="Ramas y Especialidades" icon={GitBranch} color="purple">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {[1, 2].map(slot => {
                     const pr = character.personajes_ramas?.find((r: any) => r.slot === slot);
                     return (
                       <div key={slot} className="space-y-4 p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl">
                          <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Especialidad Slot {slot}</h4>
                          <SelectField label="Rama / Clan" value={pr?.rama_id} options={masters.ramas.map((r:any)=>({label:r.nombre, value:r.id}))} disabled={!isEditing && !isNew} onChange={(v)=>{
                            const newRamas = [...(character.personajes_ramas?.filter((r:any)=>r.slot !== slot) || []), { slot, rama_id: Number(v), sub_especialidad_id: null }];
                            onUpdateField('personajes_ramas', newRamas);
                          }} />
                          <SelectField label="Sub-Especialidad" value={pr?.sub_especialidad_id} options={masters.subEspecialidades.filter((s:any)=>s.rama_id === pr?.rama_id).map((s:any)=>({label:s.nombre, value:s.id}))} disabled={!isEditing && !isNew} onChange={(v)=>{
                            const newRamas = [...(character.personajes_ramas?.filter((r:any)=>r.slot !== slot) || []), { slot, rama_id: pr?.rama_id, sub_especialidad_id: Number(v) }];
                            onUpdateField('personajes_ramas', newRamas);
                          }} />
                       </div>
                     );
                   })}
                </div>
              </SectionCard>
            </div>

            <div className="lg:col-span-4 space-y-8">
               <SectionCard title="Estado Global" icon={Activity} color="red">
                  <div className="grid gap-6">
                    <div className="bg-zinc-900/50 border border-emerald-500/20 p-8 rounded-[2.5rem] text-center group hover:border-emerald-500/40 transition-all">
                      <p className="text-[10px] font-black text-emerald-500/50 uppercase tracking-[0.2em] mb-2">Ryous</p>
                      {isNew ? (
                         <input type="number" value={character.ryous} onChange={(e)=>onUpdateField('ryous', Number(e.target.value))} className="bg-transparent text-4xl font-black text-emerald-400 italic text-center w-full outline-none" />
                      ) : (
                        <p className="text-4xl font-black text-emerald-400 italic">
                          {new Intl.NumberFormat('es-ES').format(character.ryous || 0)} <span className="text-sm">¥</span>
                        </p>
                      )}
                    </div>
                    <div className="bg-zinc-900/50 border border-blue-500/20 p-8 rounded-[2.5rem] text-center group hover:border-blue-500/40 transition-all">
                      <p className="text-[10px] font-black text-blue-500/50 uppercase tracking-[0.2em] mb-2">Experiencia</p>
                      {isNew ? (
                         <input type="number" value={character.xp} onChange={(e)=>onUpdateField('xp', Number(e.target.value))} className="bg-transparent text-4xl font-black text-blue-400 italic text-center w-full outline-none" />
                      ) : (
                        <p className="text-4xl font-black text-blue-400 italic">
                          {new Intl.NumberFormat('es-ES').format(character.xp || 0)} <span className="text-sm text-zinc-600 italic font-medium ml-1">XP</span>
                        </p>
                      )}
                    </div>
                  </div>
               </SectionCard>
            </div>
          </div>
        )}

        {activeTab === 'ninja' && (
          <SectionCard 
            title="Stats y Atributos" 
            icon={Heart} 
            color="red" 
            headerAction={
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Puntos Disponibles</span>
                <span className="text-2xl font-black text-white">
                  {puntosLibres}
                  <span className="text-zinc-600 text-sm ml-1">/ {character.puntos_stats}</span>
                </span>
              </div>
            }
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              <div className="lg:col-span-7 space-y-6">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-8">Estadísticas Base</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {['NIN', 'GEN', 'TAI', 'SM', 'FUE', 'AGI', 'EST', 'INT'].map((s) => {
                    const val = character.stats_base[s as keyof CharacterStats] || 0;
                    const max = masters.rangoRules?.[character.rango]?.stat_max || 100;
                    return (
                      <div key={s} className="bg-zinc-900/50 border border-zinc-800/50 p-6 rounded-[2rem] group hover:border-orange-500/30 transition-all text-center">
                        <span className="text-[10px] font-black text-zinc-600 uppercase block mb-3">{s}</span>
                        <input 
                          type="number" 
                          value={val} 
                          disabled={!isEditing && !isNew}
                          onChange={(e) => onUpdateStat(s as keyof CharacterStats, parseInt(e.target.value))}
                          className="bg-transparent text-3xl font-black text-white w-full text-center outline-none disabled:cursor-default"
                        />
                        <div className="text-[8px] font-bold text-zinc-700 mt-1 uppercase tracking-tighter">Max: {max}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-5 space-y-6 border-l border-zinc-900 pl-0 lg:pl-12">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-8">Atributos Calculados</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'VIT', val: character.atributos_derivados.VIT, color: 'text-red-500' },
                    { label: 'CH', val: character.atributos_derivados.CH, color: 'text-blue-500' },
                    { label: 'VEL', val: character.atributos_derivados.VEL, color: 'text-emerald-500' },
                    { label: 'RES', val: `${character.atributos_derivados.RES}%`, color: 'text-purple-500' },
                    { label: 'VR', val: character.atributos_derivados.VR, color: 'text-orange-500' },
                    { label: 'DET', val: character.atributos_derivados.DET, color: 'text-zinc-400' },
                  ].map(attr => (
                    <div key={attr.label} className="bg-zinc-950 border border-zinc-900 p-6 rounded-[2rem] flex justify-between items-center group hover:border-zinc-800 transition-all">
                      <span className="text-xs font-black text-zinc-600 uppercase tracking-widest">{attr.label}</span>
                      <span className={`text-2xl font-black ${attr.color} italic`}>
                        {String(attr.val || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {activeTab === 'inventario' && (
          <SectionCard title="Mochila y Equipo" icon={Briefcase} color="blue">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {character.personajes_inventario?.map((pi: any) => (
                  <div key={pi.item_id} className="bg-zinc-900 p-6 border border-zinc-800 rounded-3xl flex justify-between items-center group">
                    <div>
                      <p className="font-bold text-white uppercase italic">{pi.items_catalog?.nombre}</p>
                      <p className="text-[9px] text-zinc-600 uppercase">{pi.items_catalog?.categoria}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-black text-blue-500">x{pi.cantidad}</span>
                      {(canEdit || isNew) && <button onClick={()=>onUpdateField('personajes_inventario', character.personajes_inventario?.filter((i:any)=>i.item_id !== pi.item_id))} className="text-red-500 p-2 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </div>
                ))}
             </div>
             {(canEdit || isNew) && (isEditing || isNew) && (
               <div className="mt-12 pt-10 border-t border-zinc-800">
                  <SelectField label="Añadir Objeto" options={masters.items.map((i:any)=>({label:`${i.nombre} (${i.categoria})`, value:i.id}))} onChange={(v)=>{
                    const it = masters.items.find((i:any)=>i.id === Number(v));
                    if (it) onUpdateField('personajes_inventario', [...(character.personajes_inventario || []), { item_id: it.id, cantidad: 1, items_catalog: it }]);
                  }} />
               </div>
             )}
          </SectionCard>
        )}

        {activeTab === 'tecnicas' && (
          <SectionCard title="Artes Ninja" icon={Zap} color="orange">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {character.personajes_tecnicas?.map((pt: any) => (
                  <div key={pt.tecnica_id} className="bg-zinc-900 p-6 border border-zinc-800 rounded-3xl flex justify-between items-center">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-[10px] font-black text-orange-500 border border-orange-500/20">{pt.tecnicas_glosario?.rango}</div>
                       <div>
                          <p className="font-bold text-white uppercase italic">{pt.tecnicas_glosario?.nombre}</p>
                          <p className="text-[9px] text-zinc-600 uppercase">{pt.tecnicas_glosario?.subcategoria}</p>
                       </div>
                    </div>
                    {(canEdit || isNew) && <button onClick={()=>onUpdateField('personajes_tecnicas', character.personajes_tecnicas?.filter((t:any)=>t.tecnica_id !== pt.tecnica_id))} className="text-red-500 p-2 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                ))}
             </div>
             {(canEdit || isNew) && (isEditing || isNew) && (
               <div className="mt-12 pt-10 border-t border-zinc-800">
                  <SelectField label="Aprender Técnica" options={masters.tecnicas.map((t:any)=>({label:`${t.nombre} (Rango ${t.rango})`, value:t.id}))} onChange={(v)=>{
                    const tec = masters.tecnicas.find((t:any)=>t.id === Number(v));
                    if (tec) onUpdateField('personajes_tecnicas', [...(character.personajes_tecnicas || []), { tecnica_id: tec.id, tecnicas_glosario: tec }]);
                  }} />
               </div>
             )}
          </SectionCard>
        )}

        {activeTab === 'onrol' && (
          <div className="grid gap-10">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DataField label="Edad" value={character.edad} disabled={!isEditing && !isNew} onChange={(v)=>onUpdateField('edad', Number(v))} />
                <SelectField label="Sexo" value={character.sexo} options={['Masculino', 'Femenino', 'Otro']} disabled={!isEditing && !isNew} onChange={(v)=>onUpdateField('sexo', v)} />
             </div>
            <SectionCard title="Apariencia" icon={Sword} color="emerald" headerAction={!isNew && canEdit && isEditing && <button onClick={()=>onSave('apariencia')} className="px-8 py-3 bg-emerald-600 text-black text-[10px] font-black rounded-2xl uppercase tracking-widest active:scale-95 shadow-xl shadow-emerald-500/20">Sincronizar Discord</button>}>
              <textarea value={character.apariencia} disabled={!isEditing && !isNew} onChange={(e)=>onUpdateField('apariencia', e.target.value)} className="w-full h-64 bg-zinc-900/50 border border-zinc-800 rounded-[2rem] p-8 text-zinc-300 italic text-lg leading-relaxed outline-none focus:border-emerald-500 transition-all disabled:opacity-80" placeholder="Describe a tu shinobi..." />
            </SectionCard>
            <SectionCard title="Historia" icon={ScrollText} color="purple" headerAction={!isNew && canEdit && isEditing && <button onClick={()=>onSave('historia')} className="px-8 py-3 bg-purple-600 text-white text-[10px] font-black rounded-2xl uppercase tracking-widest active:scale-95 shadow-xl shadow-purple-900/20">Sincronizar Discord</button>}>
              <textarea value={character.historia} disabled={!isEditing && !isNew} onChange={(e)=>onUpdateField('historia', e.target.value)} className="w-full h-96 bg-zinc-900/50 border border-zinc-800 rounded-[2rem] p-8 text-zinc-300 text-lg leading-relaxed outline-none focus:border-purple-500 transition-all disabled:opacity-80" placeholder="Cuenta tu historia..." />
            </SectionCard>
          </div>
        )}
      </main>
    </div>
  );
}

function Edit3Icon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  );
}
