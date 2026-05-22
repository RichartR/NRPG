'use client';

import React, { useState, useMemo } from 'react';
import { Search, Filter, Coins, Zap, ChevronRight, Hash } from 'lucide-react';
import { Glosario, GlosarioCategoria, GlosarioSubcategoria } from '@/domain/types';

interface GlosarioViewProps {
  categorias: GlosarioCategoria[];
  subcategorias: GlosarioSubcategoria[];
  glosarios: Glosario[];
  ramas: any[];
  aldeas: any[];
  subespecialidades: any[];
  countByAldea?: Record<number, number>;
  countByClan?: Record<number, number>;
  cuposMaximosAldea?: number;
  cuposMaximosOrganizacion?: number;
}

export default function GlosarioView({ 
  categorias, 
  subcategorias, 
  glosarios, 
  ramas, 
  aldeas, 
  subespecialidades,
  countByAldea = {},
  countByClan = {},
  cuposMaximosAldea = 10,
  cuposMaximosOrganizacion = 10
}: GlosarioViewProps) {
  const [search, setSearch] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<number | null>(null);
  const [selectedAldea, setSelectedAldea] = useState<number | null>(null);
  const [selectedRama, setSelectedRama] = useState<number | null>(null);

  // Filtrado de datos en tiempo real
  const filteredGlosarios = useMemo(() => {
    return glosarios.filter(item => {
      const matchesSearch = 
        item.nombre_es.toLowerCase().includes(search.toLowerCase()) ||
        (item.nombre_jp && item.nombre_jp.toLowerCase().includes(search.toLowerCase()));
      
      const matchesCategoria = !selectedCategoria || item.categoria_id === selectedCategoria;
      
      // Para aldea y rama, necesitamos considerar tanto el ID directo como el heredado
      let itemAldeaId = item.aldea_id;
      let itemRamaId = item.rama_clan_id;

      if (!itemAldeaId && item.rama_clan_id) {
          const rama = ramas.find(r => Number(r.id) === Number(item.rama_clan_id));
          if (rama) itemAldeaId = rama.aldea_id;
      }

      const matchesAldea = !selectedAldea || Number(itemAldeaId) === Number(selectedAldea);
      const matchesRama = !selectedRama || Number(itemRamaId) === Number(selectedRama);
      
      return matchesSearch && matchesCategoria && matchesAldea && matchesRama;
    });
  }, [glosarios, search, selectedCategoria, selectedAldea, selectedRama, ramas]);

  // Agrupado de datos jerárquico profundo: Aldea -> Rama -> Subespecialidad -> Categoría -> Subcategoría
  const groupedData = useMemo(() => {
    // Primero, pre-procesamos los items para que hereden la aldea de su rama si no tienen una propia
    const processedGlosarios = filteredGlosarios.map(item => {
      if (item.aldea_id !== null && item.aldea_id !== undefined) return item;
      
      let derivedAldeaId: number | null = null;

      if (item.rama_clan_id) {
        const rama = ramas.find(r => Number(r.id) === Number(item.rama_clan_id));
        if (rama?.aldea_id) derivedAldeaId = rama.aldea_id;
      } else if (item.sub_especialidad_id) {
        const sub = subespecialidades.find(s => Number(s.id) === Number(item.sub_especialidad_id));
        if (sub?.rama_id) {
          const rama = ramas.find(r => Number(r.id) === Number(sub.rama_id));
          if (rama?.aldea_id) derivedAldeaId = rama.aldea_id;
        }
      }
      
      if (derivedAldeaId) {
        return { ...item, aldea_id: derivedAldeaId };
      }
      
      return item;
    });

    const aldeaGroups: any[] = [];

    // 1. Aldeas
    const uniqueAldeaIds = Array.from(new Set(processedGlosarios.map(i => i.aldea_id)));
    
    // Ordenar aldeas: primero null (General), luego por nombre
    const sortedAldeaIds = uniqueAldeaIds.sort((a, b) => {
      if (a === null) return -1;
      if (b === null) return 1;
      const nameA = aldeas.find(al => Number(al.id) === Number(a))?.nombre_completo || '';
      const nameB = aldeas.find(al => Number(al.id) === Number(b))?.nombre_completo || '';
      return nameA.localeCompare(nameB);
    });

    sortedAldeaIds.forEach(aldeaId => {
      const aldeaInfo = aldeas.find(a => Number(a.id) === Number(aldeaId)) || { id: null, nombre_completo: 'Conocimiento General', slug: 'general' };
      const itemsInAldea = processedGlosarios.filter(i => 
        (i.aldea_id === null && aldeaId === null) || 
        (Number(i.aldea_id) === Number(aldeaId))
      );
      
      const aldeaGroup: any = { info: aldeaInfo, ramas: [] };

      // 2. Ramas
      const uniqueRamaIds = Array.from(new Set(itemsInAldea.map(i => i.rama_clan_id)));
      uniqueRamaIds.sort((a, b) => {
        if (a === null) return -1;
        if (b === null) return 1;
        const nameA = ramas.find(r => Number(r.id) === Number(a))?.nombre || '';
        const nameB = ramas.find(r => Number(r.id) === Number(b))?.nombre || '';
        return nameA.localeCompare(nameB);
      }).forEach(ramaId => {
        const ramaInfo = ramas.find(r => Number(r.id) === Number(ramaId)) || { id: null, nombre: 'General' };
        const itemsInRama = itemsInAldea.filter(i => 
            (i.rama_clan_id === null && ramaId === null) || 
            (Number(i.rama_clan_id) === Number(ramaId))
        );
        const ramaGroup: any = { info: ramaInfo, subespecialidades: [] };

        // 3. Subespecialidades
        const uniqueSubIds = Array.from(new Set(itemsInRama.map(i => i.sub_especialidad_id)));
        uniqueSubIds.sort((a, b) => {
            if (a === null) return -1;
            if (b === null) return 1;
            const nameA = subespecialidades.find(s => Number(s.id) === Number(a))?.nombre || '';
            const nameB = subespecialidades.find(s => Number(s.id) === Number(b))?.nombre || '';
            return nameA.localeCompare(nameB);
        }).forEach(subId => {
          const subInfo = subespecialidades.find(s => Number(s.id) === Number(subId)) || { id: null, nombre: 'Esencial' };
          const itemsInSub = itemsInRama.filter(i => 
            (i.sub_especialidad_id === null && subId === null) || 
            (Number(i.sub_especialidad_id) === Number(subId))
          );
          const subGroup: any = { info: subInfo, categorias: [] };

          // 4. Categorías
          const uniqueCatIds = Array.from(new Set(itemsInSub.map(i => i.categoria_id)));
          uniqueCatIds.forEach(catId => {
            const catInfo = categorias.find(c => c.id === catId);
            const itemsInCat = itemsInSub.filter(i => i.categoria_id === catId);
            const catGroup: any = { info: catInfo, subcategorias: [] };

            // 5. Subcategorías
            const uniqueSubcatIds = Array.from(new Set(itemsInCat.map(i => i.subcategoria_id)));
            uniqueSubcatIds.forEach(subcatId => {
              const subcatInfo = subcategorias.find(s => s.id === subcatId) || { id: 'no-sub', nombre: 'General' };
              catGroup.subcategorias.push({
                info: subcatInfo,
                items: itemsInCat.filter(i => i.subcategoria_id === subcatId)
              });
            });
            subGroup.categorias.push(catGroup);
          });
          ramaGroup.subespecialidades.push(subGroup);
        });
        aldeaGroup.ramas.push(ramaGroup);
      });
      aldeaGroups.push(aldeaGroup);
    });

    return aldeaGroups;
  }, [categorias, subcategorias, glosarios, filteredGlosarios, aldeas, ramas, subespecialidades]);

  // Formateador de requisitos visual (ESTILO TABLA COMPACTO - TEMA CLARO)
  const renderRequisitos = (reqs: any) => {
    if (!reqs) return null;
    if (typeof reqs === 'string') return <span className="text-[9px] text-zinc-600 font-bold">{reqs}</span>;
    
    const elements: React.ReactNode[] = [];
    
    if (reqs.rango) elements.push(<span key="rango" className="text-rojo-sangre font-black">{reqs.rango}</span>);
    if (reqs.rama_id) {
      const rama = ramas.find(r => r.id === reqs.rama_id);
      elements.push(<span key="rama" className="text-amber-800 font-black">{rama?.nombre || `ID: ${reqs.rama_id}`}</span>);
    }
    if (reqs.combates) {
      elements.push(
        <span key="combates" className="text-emerald-700 font-black">
          P. COMBATE: <span className="text-emerald-950">{reqs.combates}</span>
        </span>
      );
    }
    
    if (reqs.stats && typeof reqs.stats === 'object') {
      Object.entries(reqs.stats).forEach(([stat, val]) => {
        if (val && val !== 0) elements.push(<span key={stat} className="text-zinc-500 font-black">{stat.toUpperCase()}: <span className="text-zinc-900">{String(val)}</span></span>);
      });
    }

    if (reqs.misiones && typeof reqs.misiones === 'object') {
      Object.entries(reqs.misiones).forEach(([rangoM, cant]) => {
        if (cant && cant !== 0) elements.push(<span key={rangoM} className="text-rojo-sangre font-black">M.{rangoM}: <span className="text-zinc-900">{String(cant)}</span></span>);
      });
    }

    Object.entries(reqs).forEach(([key, value]) => {
      if (['rango', 'rama_id', 'stats', 'misiones', 'personaje_id', 'combates'].includes(key)) return;
      if (value === null || value === undefined || value === 0 || value === false || value === '') return;
      elements.push(<span key={key} className="text-zinc-500 font-black">{key.replace('_', ' ').toUpperCase()}: <span className="text-zinc-900">{String(value)}</span></span>);
    });

    if (elements.length === 0) return <span className="text-[9px] text-zinc-600 italic">Sin requisitos técnicos</span>;

    return (
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] uppercase tracking-tighter leading-tight">
        {elements.map((el, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-zinc-300">|</span>}
            {el}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-10">
      {/* Barra de búsqueda y Filtros */}
      <div className="ninja-card-oro p-6 xl:p-8 flex flex-col gap-6 sticky top-4 z-[100] shadow-2xl backdrop-blur-md border-b border-oro/20">
        <div className="flex flex-col lg:flex-row gap-6 items-center">
            <div className="relative flex-1 w-full">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-oro/40 w-5 h-5" />
                <input 
                    type="text"
                    placeholder="Buscar técnica, objeto o nombre japonés..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="ninja-input w-full pl-16 text-sm xl:text-base bg-black/60"
                />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                {/* Selector de Aldea */}
                <div className="relative flex-1 sm:w-64">
                    <select
                        value={selectedAldea || ''}
                        onChange={(e) => {
                            setSelectedAldea(e.target.value ? Number(e.target.value) : null);
                            setSelectedRama(null); // Reset rama when aldea changes
                        }}
                        className="ninja-input appearance-none w-full pr-12 text-xs xl:text-sm h-full py-3 text-oro font-black"
                    >
                        <option value="" className="bg-zinc-900 text-oro">Todas las Aldeas</option>
                        {aldeas.map(a => (
                            <option key={a.id} value={a.id} className="bg-zinc-900 text-oro">{a.nombre_completo}</option>
                        ))}
                    </select>
                </div>

                {/* Selector de Rama */}
                <div className="relative flex-1 sm:w-64">
                    <select
                        value={selectedRama || ''}
                        onChange={(e) => setSelectedRama(e.target.value ? Number(e.target.value) : null)}
                        className="ninja-input appearance-none w-full pr-12 text-xs xl:text-sm h-full py-3 text-oro font-black"
                    >
                        <option value="" className="bg-zinc-900 text-oro">Todas las Ramas / Clanes</option>
                        {ramas
                            .filter(r => !selectedAldea || Number(r.aldea_id) === Number(selectedAldea))
                            .map(r => (
                                <option key={r.id} value={r.id} className="bg-zinc-900 text-oro">{r.nombre}</option>
                            ))
                        }
                    </select>
                </div>
            </div>
        </div>

        <div className="flex items-center gap-4">
            <div className="text-[10px] font-black text-oro/40 uppercase tracking-widest whitespace-nowrap">Categorías:</div>
            <div className="flex gap-3 overflow-x-auto pb-2 w-full custom-scrollbar no-scrollbar items-center">
                <button 
                    onClick={() => setSelectedCategoria(null)}
                    className={`ninja-btn px-6 py-2 whitespace-nowrap text-[9px] xl:text-xs flex items-center gap-2 ${!selectedCategoria ? 'ninja-btn-oro' : 'ninja-btn-ghost'}`}
                >
                    <Hash className="w-3 h-3" />
                    Todos
                </button>
                {categorias.map(cat => (
                    <button 
                        key={cat.id}
                        onClick={() => setSelectedCategoria(cat.id)}
                        className={`ninja-btn px-6 py-2 whitespace-nowrap text-[9px] xl:text-xs ${selectedCategoria === cat.id ? 'ninja-btn-oro' : 'ninja-btn-ghost'}`}
                    >
                        {cat.nombre}
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* Contenido del Glosario en Formato Tabla Jerárquica */}
      <div className="space-y-16 mt-10">
        {groupedData.map((aldeaGroup: any) => (
          <section key={aldeaGroup.info.id || 'general'} className="animate-in fade-in slide-in-from-bottom-10 duration-700">
            {/* NIVEL 1: ALDEA */}
            <div className="relative py-6 mb-8 border-b-2 border-oro/30">
                <div className="flex flex-col items-center text-center">
                    <span className="text-xs font-black text-rojo-sangre/40 uppercase tracking-[1em] mb-2">
                      {aldeaGroup.info.categoria_id === 2 ? 'Organización' : 'Gran Nación'}
                    </span>
                    <h2 className="text-4xl xl:text-7xl font-black text-rojo-sangre uppercase tracking-[0.2em]">
                        {aldeaGroup.info.nombre_completo}
                    </h2>
                    {aldeaGroup.info.id !== null && (
                      <div className="mt-4 px-5 py-2 bg-oro/10 border border-oro/20 rounded-none text-xs font-black text-oro tracking-[0.2em] uppercase inline-block shadow-[0_0_15px_rgba(212,175,55,0.05)]">
                        Cupos: <span className="text-white">{countByAldea[aldeaGroup.info.id] ?? 0}</span> / <span className="text-white">{aldeaGroup.info.categoria_id === 2 ? cuposMaximosOrganizacion : cuposMaximosAldea}</span>
                      </div>
                    )}
                    <div className="w-24 h-1 bg-oro mt-4 shadow-sm" />
                </div>
            </div>

            <div className="space-y-12 px-4">
              {aldeaGroup.ramas.map((ramaGroup: any) => (
                <div key={ramaGroup.info.id || 'base'} className="space-y-6">
                  {/* NIVEL 2: RAMA / CLAN */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-rojo-sangre pl-6">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-rojo-sangre/60 uppercase tracking-[0.5em] mb-1 italic">
                          {ramaGroup.info.tipo === 'clan' ? 'Clan' : 'Rama'}
                        </span>
                        <h3 className="text-3xl xl:text-5xl font-black text-zinc-900 uppercase tracking-widest">
                          {ramaGroup.info.nombre}
                          {ramaGroup.info.tipo === 'clan' && ramaGroup.info.es_especial && (
                            <span className="ml-3 text-[10px] bg-purple-600/10 border border-purple-500/20 text-purple-600 px-2 py-0.5 font-black tracking-wider uppercase rounded-sm italic align-middle">Especial</span>
                          )}
                        </h3>
                    </div>
                    {ramaGroup.info.tipo === 'clan' && ramaGroup.info.id !== null && (
                      <div className="px-4 py-2 bg-zinc-950 text-oro border border-oro/20 rounded-none text-xs font-black tracking-widest uppercase shrink-0 self-start sm:self-center shadow-lg">
                        Cupos: <span className="text-white">{countByClan[ramaGroup.info.id] ?? 0}</span> / <span className="text-white">{(ramaGroup.info.es_especial ? 2 : 4) + Math.floor((cuposMaximosAldea - 10) / 5)}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-10 pl-4 md:pl-10">
                    {ramaGroup.subespecialidades.map((subGroup: any) => (
                      <div key={subGroup.info.id || 'esencial'} className="space-y-6">
                        {/* NIVEL 3: SUBESPECIALIDAD */}
                        {subGroup.info.id !== null && (
                          <div className="flex items-center gap-4 border-b border-zinc-200 pb-4">
                              <div className="w-2 h-2 bg-rojo-sangre" />
                              <h4 className="text-xl xl:text-3xl font-black text-zinc-800 uppercase tracking-widest italic">{subGroup.info.nombre}</h4>
                          </div>
                        )}

                        <div className="space-y-8">
                          {subGroup.categorias.map((catGroup: any) => (
                            <div key={catGroup.info.id} className="space-y-4">
                                {/* NIVEL 4: CATEGORÍA */}
                                <div className="flex items-center gap-3 bg-oro/10 p-4 border border-oro/20">
                                    <Hash className="w-4 h-4 text-oro" />
                                    <h5 className="text-sm xl:text-lg font-black text-zinc-600 uppercase tracking-[0.3em]">{catGroup.info.nombre}</h5>
                                </div>

                                <div className="overflow-x-auto rounded-lg shadow-xl border border-zinc-200">
                                    <table className="w-full text-left border-collapse min-w-[900px] bg-white/60 backdrop-blur-sm">
                                        <thead>
                                            <tr className="bg-zinc-900 text-[10px] font-black uppercase tracking-[0.2em] text-oro">
                                                <th className="py-5 px-8">Nombre</th>
                                                <th className="py-5 px-8">Requisitos</th>
                                                <th className="py-5 px-8 text-center w-32">Coste EXP</th>
                                                <th className="py-5 px-8 text-center w-32">Coste RYOUS</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100">
                                            {catGroup.subcategorias.map((subcat: any) => (
                                                <React.Fragment key={subcat.info.id}>
                                                    {/* NIVEL 5: SUBCATEGORÍA */}
                                                    {subcat.info.nombre !== 'General' && (
                                                        <tr className="bg-zinc-50">
                                                            <td colSpan={4} className="py-3 px-8 text-[9px] font-black text-zinc-600 uppercase tracking-[0.4em] text-center border-y border-zinc-100 italic">
                                                                --- {subcat.info.nombre} ---
                                                            </td>
                                                        </tr>
                                                    )}
                                                    
                                                    {subcat.items.map((item: Glosario) => (
                                                        <tr key={item.id} className="bg-zinc-50 group hover:bg-oro/5 transition-all duration-300">
                                                            <td className="py-3 px-8">
                                                                <div className="flex flex-col">
                                                                    <div className="flex items-center gap-2">
                                                                        <h4 className="text-base xl:text-lg font-bold text-zinc-900 group-hover:text-rojo-sangre transition-colors uppercase tracking-tight">
                                                                            {item.nombre_jp}
                                                                        </h4>
                                                                        {item.inicial && (
                                                                            <span className="text-[7px] bg-rojo-sangre text-white px-1.5 py-0.5 font-black uppercase tracking-widest rounded-sm">Inic.</span>
                                                                        )}
                                                                    </div>
                                                                    {item.nombre_jp && (
                                                                        <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-[0.15em] italic">
                                                                            {item.nombre_es}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-8">
                                                                <div className="text-black">
                                                                    {renderRequisitos(item.requisitos)}
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-8 text-center">
                                                                <div className="flex flex-col items-center">
                                                                    <span className="text-base font-black text-zinc-900">{item.coste_exp.toLocaleString()}</span>
                                                                    <span className="text-[7px] text-zinc-400 uppercase font-black tracking-widest">Puntos</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-8 text-center">
                                                                <div className="flex flex-col items-center">
                                                                    <span className="text-base font-black text-zinc-900">{item.coste_ryous.toLocaleString()}</span>
                                                                    <span className="text-[7px] text-zinc-400 uppercase font-black tracking-widest">Ryous</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
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
          </section>
        ))}

        {groupedData.length === 0 && (
          <div className="ninja-card-oro p-24 text-center flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-500">
            <div className="relative">
                <Filter className="w-24 h-24 text-oro/5" />
                <Search className="absolute inset-0 m-auto w-10 h-10 text-oro/20" />
            </div>
            <div className="space-y-2">
                <p className="text-oro/60 font-black uppercase tracking-[0.3em] text-2xl">Pergamino no encontrado</p>
                <p className="text-oro/20 text-sm uppercase tracking-widest">No hay registros que coincidan con tu búsqueda actual</p>
            </div>
            <button 
                onClick={() => {
                    setSearch(''); 
                    setSelectedCategoria(null);
                    setSelectedAldea(null);
                    setSelectedRama(null);
                }}
                className="ninja-btn-oro px-12 py-5 text-xs xl:text-sm mt-4"
            >
                Restaurar Biblioteca
            </button>
          </div>
        )}
      </div>
      
      {/* Botón flotante para volver arriba (opcional pero útil) */}
      <button 
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-10 right-10 w-14 h-14 bg-black/80 border border-oro/20 text-oro flex items-center justify-center hover:bg-oro hover:text-rojo-sangre transition-all z-[100] ninja-clip-sm shadow-2xl md:hidden"
      >
        <ChevronRight className="w-6 h-6 -rotate-90" />
      </button>
    </div>
  );
}
