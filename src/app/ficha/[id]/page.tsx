'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  User, Shield, Briefcase, Zap, Save, RefreshCw, ArrowLeft, 
  Activity, Sword, ScrollText, Brain, Flame, Wind, Droplets, Trash2, Edit3, Heart, GitBranch, UserCircle, X
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

// --- COMPONENTES UI PREMIUM ---
function SectionCard({ title, icon: Icon, children, className = '', headerAction, color = "orange" }: any) {
  const colorMap: any = {
    orange: "text-orange-500 bg-orange-500/10 border-orange-500/20 shadow-orange-500/5",
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20 shadow-blue-500/5",
    red: "text-red-500 bg-red-500/10 border-red-500/20 shadow-red-500/5",
    purple: "text-purple-500 bg-purple-500/10 border-purple-500/20 shadow-purple-500/5",
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/5"
  };

  return (
    <div className={`relative overflow-hidden bg-zinc-950/80 border border-zinc-800/50 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-2xl ${className}`}>
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl border ${colorMap[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">{title}</h2>
        </div>
        {headerAction}
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function VitalBar({ label, current, max, color, icon: Icon }: any) {
  const percentage = Math.min(Math.max((current / max) * 100, 0), 100);
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${color === 'red' ? 'text-red-400' : 'text-blue-400'}`}>
          <Icon className="w-4 h-4" /> {label}
        </span>
        <span className="text-sm font-mono font-bold text-white">{current} <span className="text-zinc-600">/ {max}</span></span>
      </div>
      <div className="h-2.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 shadow-inner">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ease-out ${color === 'red' ? 'bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]'}`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function FichaPublicPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState('general');
  const [canEdit, setCanEdit] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [character, setCharacter] = useState<any>(null);
  const [originalCharacter, setOriginalCharacter] = useState<any>(null);
  
  // Maestros
  const [aldeas, setAldeas] = useState<any[]>([]);
  const [ramas, setRamas] = useState<any[]>([]);
  const [subEspecialidades, setSubEspecialidades] = useState<any[]>([]);
  const [itemsCatalog, setItemsCatalog] = useState<any[]>([]);
  const [tecnicasCatalog, setTecnicasCatalog] = useState<any[]>([]);
  const [rangoRules, setRangoRules] = useState<any>(null);
  const [escaladoRules, setEscaladoRules] = useState<any>(null);

  useEffect(() => {
    loadAll();
  }, [id]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const { data: a } = await supabase.from('aldeas').select('*').eq('activo', true);
      const { data: r } = await supabase.from('ramas_clanes').select('*').eq('activo', true);
      const { data: s } = await supabase.from('sub_especialidades').select('*').eq('activo', true);
      const { data: i } = await supabase.from('items_catalog').select('*').eq('activo', true);
      const { data: t } = await supabase.from('tecnicas_glosario').select('*').eq('activo', true);
      const { data: c } = await supabase.from('configuracion_sistema').select('*').eq('clave', 'rango_stats_rules').single();
      const { data: e } = await supabase.from('configuracion_sistema').select('*').eq('clave', 'stats_escalado_config').single();
      
      if (a) setAldeas(a);
      if (r) setRamas(r);
      if (s) setSubEspecialidades(s);
      if (i) setItemsCatalog(i);
      if (t) setTecnicasCatalog(t);
      if (c) setRangoRules(c.valor);
      if (e) setEscaladoRules(e.valor);

      const { data: { user } } = await supabase.auth.getUser();
      const { data: char, error } = await supabase.from('characters').select(`
        *, 
        profiles!user_id(username),
        aldeas(*), 
        personajes_inventario(*, items_catalog(*)), 
        personajes_tecnicas(*, tecnicas_glosario(*)), 
        personajes_ramas(*, ramas_clanes(*), sub_especialidades(*))
      `).eq('id', id).single();
      if (error) throw error;

      let isAdmin = false;
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        isAdmin = profile?.role === 'admin';
      }

      setCanEdit(!!(isAdmin || (user && char.user_id === user.id)));

      // Discord
      let aparienciaTexto = '';
      let historiaTexto = '';
      if (char.apariencia_msg_id) {
        try {
          const res = await fetch(`/api/discord/messages?messageId=${char.apariencia_msg_id}`);
          const dMsg = await res.json();
          if (dMsg.content) aparienciaTexto = dMsg.content.split('\n').slice(1).join('\n');
        } catch (e) {}
      }
      if (char.historia_msg_id) {
        try {
          const res = await fetch(`/api/discord/messages?messageId=${char.historia_msg_id}`);
          const dMsg = await res.json();
          if (dMsg.content) historiaTexto = dMsg.content.split('\n').slice(1).join('\n');
        } catch (e) {}
      }

      if (!char) throw new Error("No se encontró el personaje");

      setCharacter({ ...char, apariencia: aparienciaTexto, historia: historiaTexto });
    } catch (err: any) { 
      console.error("Error en loadAll:", err);
      alert("Error cargando la ficha: " + err.message);
    } finally { 
      setLoading(false); 
    }
  };
  // Cálculo de derivados
  useEffect(() => {
    if (!character || !escaladoRules || !rangoRules) return;
    
    const stats = character.stats_base;
    const bases = rangoRules[character.rango];
    const c = escaladoRules;

    if (!bases || !c) return;

    const newDerivados = {
      VIT: (Number(bases.vit_base) || 0) + (Number(stats.FUE) * (Number(c.fue_a_vit) || 0)),
      CH: (Number(bases.ch_base) || 0) + (Number(stats.EST) * (Number(c.est_a_ch) || 0)),
      VEL: (Number(bases.vel_base) || 0) + Math.floor(Number(stats.AGI) / (Number(c.agi_a_vel_factor) || 10)),
      RES: Math.floor(Number(stats.EST) / 5),
      VR: 1 + Math.floor(Number(stats.EST) / 20),
      DET: 1 + Math.floor(Number(stats.INT) / 20)
    };

    if (JSON.stringify(newDerivados) !== JSON.stringify(character.atributos_derivados)) {
      setCharacter((prev: any) => ({ ...prev, atributos_derivados: newDerivados }));
    }
  }, [character?.stats_base, character?.rango, escaladoRules, rangoRules]);

  // Cálculo de Rango Automático
  useEffect(() => {
    if (!character || !rangoRules) return;
    
    const totalStats = Number(character.puntos_stats) || 0;
    
    // Intentamos encontrar el rango basado en las reglas de la base de datos
    const rules = Object.entries(rangoRules);
    let newRango = 'D';
    let maxThresholdFound = -1;

    rules.forEach(([r, rule]: any) => {
      const threshold = Number(rule.min) || 0;
      if (totalStats >= threshold && threshold >= maxThresholdFound) {
        maxThresholdFound = threshold;
        newRango = r;
      }
    });

    console.log(`Stats Totales: ${totalStats} | Rango detectado: ${newRango}`);

    if (newRango !== character.rango) {
      setCharacter((prev: any) => ({ ...prev, rango: newRango }));
    }
  }, [character?.stats_base, rangoRules]);

  const updateCharacter = (field: string, value: any) => {
    if (!isEditing) return;
    setCharacter((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (section?: 'apariencia' | 'historia') => {
    if (!isEditing) return;
    setSaving(true);
    try {
      if (section) {
        const msgId = section === 'apariencia' ? character.apariencia_msg_id : character.historia_msg_id;
        const content = section === 'apariencia' ? character.apariencia : character.historia;
        await fetch('/api/discord/messages', {
          method: 'PATCH',
          body: JSON.stringify({ messageId: msgId, content: `**${section.toUpperCase()} DE ${character.nombre_ninja.toUpperCase()}**\n${content}` })
        });
        alert('Sincronizado con Discord');
      } else {
        const { error } = await supabase.from('characters').update({
          nombre_ninja: character.nombre_ninja,
          hobba_name: character.hobba_name,
          aldea_id: character.aldea_id,
          rango: character.rango,
          rango_jerarquico: character.rango_jerarquico,
          stats_base: character.stats_base,
          atributos_derivados: character.atributos_derivados,
          puntos_stats: character.puntos_stats,
          xp: character.xp,
          ryous: character.ryous,
          tiempo_rpg: character.tiempo_rpg,
          edad: character.edad,
          sexo: character.sexo
        }).eq('id', id);

        // Ramas
        await supabase.from('personajes_ramas').delete().eq('personaje_id', id);
        if (character.personajes_ramas.length > 0) {
          await supabase.from('personajes_ramas').insert(character.personajes_ramas.map((r: any) => ({
            personaje_id: id,
            rama_id: r.rama_id,
            sub_especialidad_id: r.sub_especialidad_id,
            slot: r.slot || 1
          })));
        }

        // Inventario y Técnicas
        await supabase.from('personajes_inventario').delete().eq('personaje_id', id);
        if (character.personajes_inventario.length > 0) {
          await supabase.from('personajes_inventario').insert(character.personajes_inventario.map((i:any) => ({ personaje_id: id, item_id: i.item_id, cantidad: i.cantidad })));
        }
        await supabase.from('personajes_tecnicas').delete().eq('personaje_id', id);
        if (character.personajes_tecnicas.length > 0) {
          await supabase.from('personajes_tecnicas').insert(character.personajes_tecnicas.map((t:any) => ({ personaje_id: id, tecnica_id: t.tecnica_id })));
        }

        if (error) throw error;
        setIsEditing(false);
        alert('Ficha guardada');
      }
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  if (loading || !character) return <div className="min-h-screen bg-black flex items-center justify-center"><RefreshCw className="w-12 h-12 text-orange-500 animate-spin" /></div>;
  
  const puntosGastados: number = Object.values(character.stats_base || {}).reduce((a: any, b: any) => Number(a) + Number(b), 0) as number;
  const puntosLibres: number = (Number(character.puntos_stats) || 0) - puntosGastados;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans selection:bg-orange-500/30">
      <header className="sticky top-0 z-50 bg-zinc-950/80 border-b border-zinc-800/50 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => router.back()} className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-all active:scale-95">
              <ArrowLeft className="w-5 h-5 text-zinc-400" />
            </button>
            <div>
              <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none mb-1">{character.nombre_ninja}</h1>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{character.rango_jerarquico}</span>
                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{character.aldeas?.nombre_completo || 'Sin Aldea'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {canEdit && (
              <button 
                onClick={() => {
                  if (!isEditing) {
                    setOriginalCharacter(JSON.parse(JSON.stringify(character)));
                  } else {
                    setCharacter(originalCharacter);
                  }
                  setIsEditing(!isEditing);
                }} 
                className={`flex items-center gap-3 px-6 py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all active:scale-95 border ${isEditing ? 'bg-zinc-100 text-black border-white' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'}`}
              >
                {isEditing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                {isEditing ? 'Cancelar' : 'Editar Ficha'}
              </button>
            )}
            {isEditing && (
              <button onClick={() => handleSave()} disabled={saving} className="flex items-center gap-3 px-8 py-4 bg-orange-600 hover:bg-orange-500 text-black rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-orange-500/20 active:scale-95 disabled:opacity-50">
                <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} /> Guardar
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        <div className="flex gap-3 mb-12 overflow-x-auto pb-4 scrollbar-hide">
          {['general', 'ninja', 'inventario', 'tecnicas', 'onrol'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-10 py-4 rounded-[2rem] text-[11px] font-black uppercase tracking-widest transition-all border ${activeTab === tab ? 'bg-white text-black border-white shadow-xl shadow-white/5' : 'bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:border-zinc-700'}`}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'general' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
              <SectionCard title="Información Básica" icon={User} color="emerald">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <DataField label="Usuario de Discord (Player)" value={character.profiles?.username || 'No vinculado'} disabled={true} />
                    <DataField label="Nombre en Hobba" value={character.hobba_name} disabled={!isEditing} onChange={(v:any)=>updateCharacter('hobba_name', v)} />
                    <DataField label="Tiempo en el RPG" value={character.tiempo_rpg} disabled={!isEditing} onChange={(v:any)=>updateCharacter('tiempo_rpg', v)} />
                 </div>
              </SectionCard>

              <SectionCard title="Información de Personaje" icon={UserCircle} color="blue">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DataField label="Nombre Ninja" value={character.nombre_ninja} disabled={!isEditing} onChange={(v:any)=>updateCharacter('nombre_ninja', v)} />
                    <SelectField 
                      label="Aldea" 
                      value={character.aldea_id} 
                      options={aldeas.map(a=>({label:a.nombre_completo, value:a.id}))} 
                      disabled={!isEditing} 
                      placeholder="Sin aldea"
                      onChange={(v:any)=>updateCharacter('aldea_id', v ? Number(v) : null)} 
                    />
                    <DataField label="Rango" value={`Rango ${character.rango}`} disabled={true} />
                    <DataField label="Rango Jerárquico" value={character.rango_jerarquico} disabled={!isEditing} onChange={(v:any)=>updateCharacter('rango_jerarquico', v)} />
                 </div>
              </SectionCard>

              <SectionCard title="Ramas y Especialidades" icon={GitBranch} color="purple">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {[1, 2].map(slot => {
                     const pr = character.personajes_ramas.find((r:any) => r.slot === slot);
                     return (
                       <div key={slot} className="space-y-4 p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl">
                          <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Especialidad Slot {slot}</h4>
                          <SelectField label="Rama / Clan" value={pr?.rama_id} options={ramas.map(r=>({label:r.nombre, value:r.id}))} disabled={!isEditing} onChange={(v:any)=>{
                            const newRamas = [...character.personajes_ramas.filter((r:any)=>r.slot !== slot), { slot, rama_id: Number(v), sub_especialidad_id: null }];
                            updateCharacter('personajes_ramas', newRamas);
                          }} />
                          <SelectField label="Sub-Especialidad" value={pr?.sub_especialidad_id} options={subEspecialidades.filter(s=>s.rama_id === pr?.rama_id).map(s=>({label:s.nombre, value:s.id}))} disabled={!isEditing} onChange={(v:any)=>{
                            const newRamas = [...character.personajes_ramas.filter((r:any)=>r.slot !== slot), { slot, rama_id: pr?.rama_id, sub_especialidad_id: Number(v) }];
                            updateCharacter('personajes_ramas', newRamas);
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
                      <p className="text-[10px] font-black text-emerald-500/50 uppercase tracking-[0.2em] mb-2">Ryous Totales</p>
                      <p className="text-4xl font-black text-emerald-400 italic">
                        {new Intl.NumberFormat('es-ES').format(character.ryous || 0)} <span className="text-sm">¥</span>
                      </p>
                    </div>
                    <div className="bg-zinc-900/50 border border-blue-500/20 p-8 rounded-[2.5rem] text-center group hover:border-blue-500/40 transition-all">
                      <p className="text-[10px] font-black text-blue-500/50 uppercase tracking-[0.2em] mb-2">Experiencia Total</p>
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
              {/* Columna Izquierda: Estadísticas Base */}
              <div className="lg:col-span-7 space-y-6">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-8">Estadísticas Base</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {['NIN', 'GEN', 'TAI', 'SM', 'FUE', 'AGI', 'EST', 'INT'].map((s) => {
                    const val = character.stats_base[s] || 0;
                    const max = rangoRules?.[character.rango]?.stat_max || 100;
                    return (
                      <div key={s} className="bg-zinc-900/50 border border-zinc-800/50 p-6 rounded-[2rem] group hover:border-orange-500/30 transition-all text-center">
                        <span className="text-[10px] font-black text-zinc-600 uppercase block mb-3">{s}</span>
                        <input 
                          type="number" 
                          value={val} 
                          disabled={!isEditing}
                          onChange={(e) => {
                            const v = parseInt(e.target.value);
                            if (isNaN(v)) return;
                            if (v < 1) return;

                            const rules = rangoRules?.[character.rango];
                            if (rules) {
                              // 1. Determinar el techo absoluto (el stat_max o el valor más alto en limites)
                              const limiteVals = Object.keys(rules.limites || {}).map(Number);
                              const absoluteMax = Math.max(rules.stat_max, ...limiteVals);
                              if (v > absoluteMax) return;

                              // 2. Validar cantidades (ej: solo tres "3" en rango D)
                              if (rules.limites) {
                                const simulatedStats = { ...character.stats_base, [s]: v };
                                for (const [limitValStr, maxAllowed] of Object.entries(rules.limites)) {
                                  const limitVal = Number(limitValStr);
                                  const count = Object.values(simulatedStats).filter(sv => Number(sv) === limitVal).length;
                                  if (count > (maxAllowed as number)) {
                                    alert(`Límite excedido: En este rango solo puedes tener ${maxAllowed} stats con valor ${limitVal}.`);
                                    return;
                                  }
                                }
                              }
                            }

                            const newSum = puntosGastados - Number(character.stats_base[s]) + v;
                            if (newSum > character.puntos_stats) return;
                            updateCharacter('stats_base', { ...character.stats_base, [s]: v });
                          }}
                          className="bg-transparent text-3xl font-black text-white w-full text-center outline-none disabled:cursor-default"
                        />
                        <div className="text-[8px] font-bold text-zinc-700 mt-1 uppercase tracking-tighter">Max: {max}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Columna Derecha: Atributos Calculados */}
              <div className="lg:col-span-5 space-y-6 border-l border-zinc-900 pl-0 lg:pl-12">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-8">Atributos Calculados (Final)</h3>
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
                      <span className={`text-2xl font-black ${attr.color} italic`}>{attr.val}</span>
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
                      <p className="font-bold text-white uppercase italic">{pi.items_catalog.nombre}</p>
                      <p className="text-[9px] text-zinc-600 uppercase">{pi.items_catalog.categoria}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-black text-blue-500">x{pi.cantidad}</span>
                      {canEdit && <button onClick={()=>updateCharacter('personajes_inventario', character.personajes_inventario.filter((i:any)=>i.item_id !== pi.item_id))} className="text-red-500 p-2 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </div>
                ))}
             </div>
             {canEdit && (
               <div className="mt-12 pt-10 border-t border-zinc-800">
                  <SelectField label="Añadir Objeto al Inventario" options={itemsCatalog.map(i=>({label:`${i.nombre} (${i.categoria})`, value:i.id}))} onChange={(v:any)=>{
                    const it = itemsCatalog.find(i=>i.id === Number(v));
                    if (it) updateCharacter('personajes_inventario', [...(character.personajes_inventario || []), { item_id: it.id, cantidad: 1, items_catalog: it }]);
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
                       <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-[10px] font-black text-orange-500 border border-orange-500/20">{pt.tecnicas_glosario.rango}</div>
                       <div>
                          <p className="font-bold text-white uppercase italic">{pt.tecnicas_glosario.nombre}</p>
                          <p className="text-[9px] text-zinc-600 uppercase">{pt.tecnicas_glosario.subcategoria}</p>
                       </div>
                    </div>
                    {canEdit && <button onClick={()=>updateCharacter('personajes_tecnicas', character.personajes_tecnicas.filter((t:any)=>t.tecnica_id !== pt.tecnica_id))} className="text-red-500 p-2 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                ))}
             </div>
             {canEdit && (
               <div className="mt-12 pt-10 border-t border-zinc-800">
                  <SelectField label="Aprender Nueva Técnica" options={tecnicasCatalog.map(t=>({label:`${t.nombre} (Rango ${t.rango})`, value:t.id}))} onChange={(v:any)=>{
                    const tec = tecnicasCatalog.find(t=>t.id === Number(v));
                    if (tec) updateCharacter('personajes_tecnicas', [...(character.personajes_tecnicas || []), { tecnica_id: tec.id, tecnicas_glosario: tec }]);
                  }} />
               </div>
             )}
          </SectionCard>
        )}

        {activeTab === 'onrol' && (
          <div className="grid gap-10">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DataField label="Edad" value={character.edad} disabled={!isEditing} onChange={(v:any)=>updateCharacter('edad', v)} />
                <SelectField label="Sexo" value={character.sexo} options={['Masculino', 'Femenino', 'Otro']} disabled={!isEditing} onChange={(v:any)=>updateCharacter('sexo', v)} />
             </div>
            <SectionCard title="Apariencia" icon={Sword} color="emerald" headerAction={canEdit && <button onClick={()=>handleSave('apariencia')} className="px-8 py-3 bg-emerald-600 text-black text-[10px] font-black rounded-2xl uppercase tracking-widest active:scale-95 shadow-xl shadow-emerald-500/20">Sincronizar Discord</button>}>
              <textarea value={character.apariencia} disabled={!isEditing} onChange={(e)=>updateCharacter('apariencia', e.target.value)} className="w-full h-64 bg-zinc-900/50 border border-zinc-800 rounded-[2rem] p-8 text-zinc-300 italic text-lg leading-relaxed outline-none focus:border-emerald-500 transition-all disabled:opacity-80" placeholder="Describe a tu shinobi..." />
            </SectionCard>
            <SectionCard title="Historia" icon={ScrollText} color="purple" headerAction={canEdit && <button onClick={()=>handleSave('historia')} className="px-8 py-3 bg-purple-600 text-white text-[10px] font-black rounded-2xl uppercase tracking-widest active:scale-95 shadow-xl shadow-purple-900/20">Sincronizar Discord</button>}>
              <textarea value={character.historia} disabled={!isEditing} onChange={(e)=>updateCharacter('historia', e.target.value)} className="w-full h-96 bg-zinc-900/50 border border-zinc-800 rounded-[2rem] p-8 text-zinc-300 text-lg leading-relaxed outline-none focus:border-purple-500 transition-all disabled:opacity-80" placeholder="Cuenta tu historia..." />
            </SectionCard>
          </div>
        )}
      </main>
    </div>
  );
}

function DataField({ label, value, onChange, disabled, type = "text" }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">{label}</label>
      <input type={type} value={value || ''} disabled={disabled} onChange={(e)=>onChange(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-emerald-500 transition-all disabled:opacity-50" />
    </div>
  );
}

function SelectField({ label, value, options, onChange, disabled, placeholder = "Seleccionar..." }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">{label}</label>
      <select value={value || ''} disabled={disabled} onChange={(e)=>onChange(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-emerald-500 appearance-none disabled:opacity-50">
        <option value="">{placeholder}</option>
        {options.map((o:any) => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
      </select>
    </div>
  );
}
