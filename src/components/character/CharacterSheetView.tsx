'use client';

import { 
  User, Shield, Briefcase, Zap, Save, RefreshCw, ArrowLeft, 
  Activity, Sword, ScrollText, GitBranch, UserCircle, X, Heart, Trash2, Edit3
} from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import { DataField, SelectField, SearchableSelect } from '@/components/ui/Fields';
import { Character, CharacterStats, Glosario, PersonajeItem, PersonajeTecnica } from '@/domain/types';
import { useToastStore } from '@/components/ui/Toast';

interface CharacterSheetViewProps {
  character: Character;
  masters: any; // Masters still contains mixed data, but we'll tipify its usage
  isEditing: boolean;
  canEdit: boolean;
  activeTab: string;
  saving: boolean;
  isAdmin?: boolean;
  isNew?: boolean;
  onUpdateField: (field: keyof Character, value: any) => void;
  onUpdateStat: (stat: keyof CharacterStats, value: number) => void;
  onSave: (section?: string) => void;
  onCancel: () => void;
  onDelete?: () => void;
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
  isAdmin = false,
  onUpdateField,
  onUpdateStat,
  onSave,
  onCancel,
  onDelete,
  onSetActiveTab,
  onBack,
  setIsEditing
}: CharacterSheetViewProps) {
  const addToast = useToastStore(state => state.addToast);
  const puntosGastados = Object.values(character.stats_base || {}).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0);
  const puntosLibres = (Number(character.puntos_stats) || 0) - puntosGastados;
  const aldeaObj = masters.aldeas.find((a: any) => a.id == character.aldea_id);
  
  const currentRankValue = masters.rankOrder[character.rango || 'D'] || 0;
  const requiredRankValue = masters.rankOrder[masters.requiredTrainingRank] || 0;
  const canAccessTraining = currentRankValue >= requiredRankValue;

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
            {!isNew && isAdmin && onDelete && (
              <button 
                onClick={onDelete}
                className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl hover:bg-red-500 hover:text-black transition-all active:scale-95 group"
                title="Borrar Personaje"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            {!isNew && canEdit && (
              <button 
                onClick={() => isEditing ? onCancel() : setIsEditing?.(true)} 
                className={`flex items-center gap-3 px-6 py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all active:scale-95 border ${isEditing ? 'bg-zinc-100 text-black border-white' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'}`}
              >
                {isEditing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
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
                     const pr = character.personajes_ramas?.find((r: any) => Number(r.slot) === slot);
                     return (
                       <div key={slot} className="space-y-4 p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl">
                          <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Especialidad Slot {slot}</h4>
                          <SelectField 
                            label="Rama / Clan" 
                            value={pr?.rama_id} 
                            options={masters.ramas.map((r:any)=>({label:r.nombre, value:r.id}))} 
                            disabled={!isEditing && !isNew} 
                            onChange={(v)=>{
                              const newRamas = [...(character.personajes_ramas?.filter((r:any)=>Number(r.slot) !== slot) || []), { slot, rama_id: Number(v), sub_especialidad_id: null, id_entrenamiento: null }];
                              onUpdateField('personajes_ramas', newRamas);
                            }} 
                          />
                          {masters.subEspecialidades.some((s: any) => s.rama_id === pr?.rama_id) && (
                            <SelectField 
                              label="Sub-Especialidad" 
                              value={pr?.sub_especialidad_id} 
                              options={masters.subEspecialidades.filter((s:any)=>s.rama_id === pr?.rama_id).map((s:any)=>({label:s.nombre, value:s.id}))} 
                              disabled={!isEditing && !isNew} 
                              onChange={(v)=>{
                                const newRamas = [...(character.personajes_ramas?.filter((r:any)=>Number(r.slot) !== slot) || []), { ...pr, slot, rama_id: pr?.rama_id, sub_especialidad_id: v ? Number(v) : null, id_entrenamiento: null }];
                                onUpdateField('personajes_ramas', newRamas);
                              }} 
                            />
                          )}
                          {canAccessTraining && (
                            <SelectField 
                              label="Entrenamiento" 
                              value={pr?.id_entrenamiento} 
                              options={masters.entrenamientos
                                .filter((e: any) => 
                                  e.id_ramaclan === pr?.rama_id && 
                                  (!pr?.sub_especialidad_id ? !e.id_subespecialidad : (e.id_subespecialidad === pr?.sub_especialidad_id || !e.id_subespecialidad))
                                )
                                .map((e: any) => ({ label: e.nombre_esp, value: e.id }))
                              } 
                              disabled={!isEditing && !isNew} 
                              onChange={(v) => {
                                const newRamas = [...(character.personajes_ramas?.filter((r: any) => Number(r.slot) !== slot) || []), { ...pr, slot, id_entrenamiento: v ? Number(v) : null }];
                                onUpdateField('personajes_ramas', newRamas);
                              }} 
                            />
                          )}
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
                      <p className="text-4xl font-black text-emerald-400 italic">
                        {new Intl.NumberFormat('es-ES').format(character.ryous || 0)} <span className="text-sm">¥</span>
                      </p>
                    </div>
                    <div className="bg-zinc-900/50 border border-blue-500/20 p-8 rounded-[2.5rem] text-center group hover:border-blue-500/40 transition-all">
                      <p className="text-[10px] font-black text-blue-500/50 uppercase tracking-[0.2em] mb-2">Experiencia</p>
                      <p className="text-4xl font-black text-blue-400 italic">
                        {new Intl.NumberFormat('es-ES').format(character.xp || 0)} <span className="text-sm text-zinc-600 italic font-medium ml-1">XP</span>
                      </p>
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
            <div className="space-y-12">
              {Object.entries(
                (character.personajes_inventario || []).reduce((acc: Record<string, Record<string, PersonajeItem[]>>, pi: PersonajeItem) => {
                  const cat = pi.info_glosario?.info_glosario_categorias?.nombre || 'General';
                  const sub = pi.info_glosario?.info_glosario_subcategorias?.nombre || 'Otros';
                  if (!acc[cat]) acc[cat] = {};
                  if (!acc[cat][sub]) acc[cat][sub] = [];
                  acc[cat][sub].push(pi);
                  return acc;
                }, {})
              ).map(([catName, subs]: [string, any]) => (
                <div key={catName} className="space-y-6">
                  <div className="flex items-center gap-4">
                    <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">{catName}</h3>
                    <div className="flex-1 h-px bg-zinc-800" />
                  </div>
                  
                  <div className="space-y-8">
                    {Object.entries(subs).map(([subName, items]: [string, any]) => (
                      <div key={subName} className="space-y-4">
                        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">{subName}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {items.map((pi: PersonajeItem, idx: number) => (
                            <div key={`${pi.item_id}-${idx}`} className="bg-zinc-900/50 p-6 border border-zinc-800/50 rounded-3xl flex justify-between items-center group hover:border-blue-500/30 transition-all">
                              <div>
                                <p className="font-bold text-white uppercase italic text-sm">{pi.info_glosario?.nombre_es}</p>
                                <p className="text-[9px] text-zinc-600 uppercase font-bold">{pi.info_glosario?.nombre_jp || '---'}</p>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-xl font-black text-blue-500">x{pi.cantidad}</span>
                                {(canEdit || isNew) && (
                                 <button 
                                   onClick={()=>{
                                     const isNewlyAdded = !pi.id;
                                     if (isNewlyAdded) {
                                       if (pi.info_glosario?.coste_exp) onUpdateField('xp', (character.xp || 0) + pi.info_glosario.coste_exp);
                                       if (pi.info_glosario?.coste_ryo) onUpdateField('ryous', (character.ryous || 0) + pi.info_glosario.coste_ryo);
                                     }
                                     onUpdateField('personajes_inventario', character.personajes_inventario?.filter((i: PersonajeItem)=>i.item_id !== pi.item_id));
                                   }} 
                                   className="text-red-500/50 p-2 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all"
                                 >
                                   <Trash2 className="w-4 h-4" />
                                 </button>
                               )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
             {(canEdit || isNew) && (isEditing || isNew) && (
               <div className="mt-12 pt-10 border-t border-zinc-800">
                  <SearchableSelect 
                    label="Añadir Objeto" 
                    placeholder="Buscar objeto en el glosario..."
                    options={(masters.glosario || [])
                      .filter((i: Glosario) => i.categoria_id === 2 && !(character.personajes_inventario || []).some((pi: PersonajeItem) => pi.item_id === i.id))
                      .map((i: any) => ({ 
                        label: `${i.nombre_es} (${i.info_glosario_subcategorias?.nombre || 'General'}) — ${i.coste_exp} EXP / ${i.coste_ryo} Ryous`, 
                        value: i.id 
                      }))
                    } 
                    onChange={(v) => {
                      const it = (masters.glosario || []).find((i: any) => i.id === Number(v));
                      const current = character.personajes_inventario || [];
                      
                      if (it && !current.some((i: any) => i.item_id === it.id)) {
                        const costExp = it.coste_exp || 0;
                        const costRyo = it.coste_ryo || 0;
                        const currentExp = character.xp || 0;
                        const currentRyo = character.ryous || 0;

                        if (currentExp < costExp || currentRyo < costRyo) {
                          addToast(`No tienes recursos suficientes. Necesitas ${costExp} EXP y ${costRyo} Ryous.`, "error");
                          return;
                        }

                        onUpdateField('personajes_inventario', [...current, { item_id: it.id, cantidad: 1, info_glosario: it }]);
                        if (costExp > 0) onUpdateField('xp', currentExp - costExp);
                        if (costRyo > 0) onUpdateField('ryous', currentRyo - costRyo);
                      }
                    }} 
                  />
               </div>
             )}
          </SectionCard>
        )}

        {activeTab === 'tecnicas' && (
          <SectionCard title="Artes Ninja" icon={Zap} color="orange">
            <div className="space-y-12">
              {Object.entries(
                (character.personajes_tecnicas || []).reduce((acc: Record<string, Record<string, PersonajeTecnica[]>>, pt: PersonajeTecnica) => {
                  const cat = pt.info_glosario?.info_glosario_categorias?.nombre || 'General';
                  const sub = pt.info_glosario?.info_glosario_subcategorias?.nombre || 'Otros';
                  if (!acc[cat]) acc[cat] = {};
                  if (!acc[cat][sub]) acc[cat][sub] = [];
                  acc[cat][sub].push(pt);
                  return acc;
                }, {})
              ).map(([catName, subs]: [string, any]) => (
                <div key={catName} className="space-y-6">
                  <div className="flex items-center gap-4">
                    <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">{catName}</h3>
                    <div className="flex-1 h-px bg-zinc-800" />
                  </div>
                  
                  <div className="space-y-8">
                    {Object.entries(subs).map(([subName, items]: [string, any]) => (
                      <div key={subName} className="space-y-4">
                        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">{subName}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {items.map((pt: PersonajeTecnica, idx: number) => (
                            <div key={`${pt.tecnica_id}-${idx}`} className="bg-zinc-900/50 p-6 border border-zinc-800/50 rounded-3xl flex justify-between items-center group hover:border-orange-500/30 transition-all">
                              <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-[10px] font-black text-orange-500 border border-orange-500/20">{pt.info_glosario?.requisitos?.rango || 'D'}</div>
                                 <div>
                                    <p className="font-bold text-white uppercase italic text-sm">{pt.info_glosario?.nombre_es}</p>
                                    <p className="text-[9px] text-zinc-600 uppercase font-bold">{pt.info_glosario?.nombre_jp || '---'}</p>
                                 </div>
                              </div>
                              {(canEdit || isNew) && (
                                 <button 
                                   onClick={()=>{
                                     const isNewlyAdded = !pt.id;
                                     if (isNewlyAdded) {
                                       if (pt.info_glosario?.coste_exp) onUpdateField('xp', (character.xp || 0) + pt.info_glosario.coste_exp);
                                       if (pt.info_glosario?.coste_ryo) onUpdateField('ryous', (character.ryous || 0) + pt.info_glosario.coste_ryo);
                                     }
                                     onUpdateField('personajes_tecnicas', character.personajes_tecnicas?.filter((t: PersonajeTecnica)=>t.tecnica_id !== pt.tecnica_id));
                                   }} 
                                   className="text-red-500/50 p-2 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all"
                                 >
                                   <Trash2 className="w-4 h-4" />
                                 </button>
                               )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
             {(canEdit || isNew) && (isEditing || isNew) && (
               <div className="mt-12 pt-10 border-t border-zinc-800">
                  <SearchableSelect 
                    label="Aprender Técnica" 
                    placeholder="Buscar técnica en el glosario..."
                    options={(masters.glosario || [])
                      .filter((i: Glosario) => i.categoria_id !== 2 && !(character.personajes_tecnicas || []).some((pt: PersonajeTecnica) => pt.tecnica_id === i.id))
                      .map((t: any) => ({ 
                        label: `${t.nombre_es} (Rango ${t.requisitos?.rango || 'D'}) — ${t.coste_exp} EXP / ${t.coste_ryo} Ryous`, 
                        value: t.id 
                      }))
                    } 
                    onChange={(v) => {
                      const tec = (masters.glosario || []).find((t: any) => t.id === Number(v));
                      const current = character.personajes_tecnicas || [];
                      
                      if (tec && !current.some((t: any) => t.tecnica_id === tec.id)) {
                        const costExp = tec.coste_exp || 0;
                        const costRyo = tec.coste_ryo || 0;
                        const currentExp = character.xp || 0;
                        const currentRyo = character.ryous || 0;

                        if (currentExp < costExp || currentRyo < costRyo) {
                          addToast(`No tienes recursos suficientes. Necesitas ${costExp} EXP y ${costRyo} Ryous.`, "error");
                          return;
                        }

                        onUpdateField('personajes_tecnicas', [...current, { tecnica_id: tec.id, info_glosario: tec }]);
                        if (costExp > 0) onUpdateField('xp', currentExp - costExp);
                        if (costRyo > 0) onUpdateField('ryous', currentRyo - costRyo);
                      }
                    }} 
                  />
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

