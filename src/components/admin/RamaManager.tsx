'use client';

import { useState } from 'react';
import { GitBranch, Layers, Dumbbell, ArrowRight } from 'lucide-react';
import RamaList from './RamaList';
import SubEspecialidadList from './SubEspecialidadList';
import EntrenamientoList from './EntrenamientoList';
import { RamaClan, SubEspecialidad, Entrenamiento, Aldea } from '@/domain/types';

type Section = 'hub' | 'ramas' | 'subs' | 'trainings';

interface Props {
  initialRamas: RamaClan[];
  initialSubs: SubEspecialidad[];
  initialEntrenamientos: Entrenamiento[];
  aldeas: Aldea[];
}

export default function RamaManager({ initialRamas, initialSubs, initialEntrenamientos, aldeas }: Props) {
  const [activeSection, setActiveSection] = useState<Section>('hub');

  if (activeSection === 'hub') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <HubCard
          title="Ramas y Clanes"
          desc="Administra las ramas principales y clanes de las aldeas."
          icon={<GitBranch size={22} />}
          count={initialRamas.filter(r => r.activo).length}
          onClick={() => setActiveSection('ramas')}
        />
        <HubCard
          title="Sub-especialidades"
          desc="Gestiona especialidades vinculadas a ramas y clanes."
          icon={<Layers size={22} />}
          count={initialSubs.filter(s => s.activo).length}
          onClick={() => setActiveSection('subs')}
        />
        <HubCard
          title="Entrenamientos"
          desc="Configura los requisitos de entrenamiento del sistema."
          icon={<Dumbbell size={22} />}
          count={initialEntrenamientos.filter(e => e.activo).length}
          onClick={() => setActiveSection('trainings')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="ninja-card-oro p-6 sm:p-8 xl:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden bg-black/40 border border-oro/10 mb-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-oro/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

        <div className="flex flex-col gap-2 relative z-10">
          <button
            onClick={() => setActiveSection('hub')}
            className="flex items-center gap-3 text-oro/60 hover:text-oro transition-all mb-6 text-caption font-black uppercase tracking-[0.3em] group cursor-pointer bg-transparent border-none p-0 outline-none align-middle"
          >
            <div className="w-1.5 h-1.5 bg-oro/40 group-hover:bg-oro rotate-45 transition-colors" />
            VOLVER AL MENÚ DE RAMAS
          </button>
          <h2 className="ninja-title text-3xl sm:text-4xl xl:text-5xl leading-none">
            GESTIÓN DE <span className="text-white">{activeSection === 'ramas' ? 'RAMAS Y CLANES' : activeSection === 'subs' ? 'SUB-ESPECIALIDADES' : 'ENTRENAMIENTOS'}</span>
          </h2>
        </div>
      </div>

      {activeSection === 'ramas' && <RamaList initialRamas={initialRamas} aldeas={aldeas} />}
      {activeSection === 'subs' && <SubEspecialidadList initialSubs={initialSubs} ramas={initialRamas} />}
      {activeSection === 'trainings' && (
        <EntrenamientoList
          initialEntrenamientos={initialEntrenamientos}
          ramas={initialRamas}
          subEspecialidades={initialSubs}
        />
      )}
    </div>
  );
}

function HubCard({ title, desc, icon, count, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="group relative p-10 ninja-card-oro hover:scale-[1.02] transition-all duration-500 flex flex-col justify-between text-left overflow-hidden w-full"
    >
      {/* Sutil Glow de fondo */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-oro/[0.02] rounded-full blur-3xl group-hover:bg-oro/[0.05] transition-all pointer-events-none" />

      <div className="relative z-10 w-full">
        <div className="flex items-center justify-between mb-12">
          <div className="w-12 h-12 bg-oro/[0.03] border border-oro/10 flex items-center justify-center group-hover:bg-oro group-hover:text-rojo-sangre transition-all duration-500 ninja-clip-xs">
            <span className="text-oro/60 group-hover:text-inherit transition-colors">{icon}</span>
          </div>
          <div
            className="flex items-center gap-2 bg-oro/5 border border-oro/10 px-4 py-1.5 w-fit ninja-clip-xs"
          >
            <span className="text-oro font-black text-sm leading-none">{count}</span>
            <span className="text-oro/30 font-black text-caption uppercase tracking-widest">Activos</span>
          </div>
        </div>

        <h3 className="text-2xl xl:text-3xl font-black text-oro uppercase tracking-widest mb-4 group-hover:translate-x-1 transition-transform leading-none">{title}</h3>
        <p className="text-gris-texto/60 text-sm leading-relaxed mb-10 max-w-[280px]">{desc}</p>
      </div>

      <div className="flex items-center gap-4 text-caption font-black text-oro/30 uppercase tracking-[0.3em] group-hover:text-oro transition-all mt-auto pt-6 border-t border-oro/[0.02]">
        <span>Administrar</span>
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
      </div>
    </button>
  );
}
