'use client';

import { useState } from 'react';
import { 
  GitBranch, Layers, Dumbbell, 
  ChevronLeft, ArrowRight, Box
} from 'lucide-react';
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
          icon={<GitBranch size={32} />} 
          count={initialRamas.filter(r => r.activo).length} 
          onClick={() => setActiveSection('ramas')} 
          color="blue" 
        />
        <HubCard 
          title="Sub-especialidades" 
          desc="Gestiona especialidades vinculadas a ramas y clanes." 
          icon={<Layers size={32} />} 
          count={initialSubs.filter(s => s.activo).length} 
          onClick={() => setActiveSection('subs')} 
          color="purple" 
        />
        <HubCard 
          title="Entrenamientos" 
          desc="Configura los requisitos de entrenamiento del sistema." 
          icon={<Dumbbell size={32} />} 
          count={initialEntrenamientos.filter(e => e.activo).length} 
          onClick={() => setActiveSection('trainings')} 
          color="amber" 
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <button 
            onClick={() => setActiveSection('hub')} 
            className="flex items-center gap-3 text-zinc-500 hover:text-white transition-colors group w-fit"
          >
            <div className="p-2 bg-zinc-900 rounded-xl group-hover:bg-zinc-800 transition-colors"><ChevronLeft size={16} /></div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Volver al Panel</span>
          </button>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
            Gestión de <span className={`text-${activeSection === 'ramas' ? 'blue' : activeSection === 'subs' ? 'purple' : 'amber'}-500`}>
              {activeSection === 'ramas' ? 'RAMAS Y CLANES' : activeSection === 'subs' ? 'SUB-ESPECIALIDADES' : 'ENTRENAMIENTOS'}
            </span>
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

function HubCard({ title, desc, icon, count, onClick, color }: any) {
  const colors: any = {
    blue: 'text-blue-500 bg-blue-500/10 hover:border-blue-500/40',
    purple: 'text-purple-500 bg-purple-500/10 hover:border-purple-500/40',
    amber: 'text-amber-500 bg-amber-500/10 hover:border-amber-500/40'
  };
  
  return (
    <button 
      onClick={onClick} 
      className={`group relative p-12 bg-zinc-900 border border-zinc-800 rounded-[3rem] text-left transition-all hover:scale-[1.02] active:scale-95 ${colors[color]}`}
    >
      <div className="mb-8 p-6 rounded-2xl bg-black/40 w-fit group-hover:scale-110 transition-transform">{icon}</div>
      <div className="space-y-3 mb-10">
        <h3 className="text-3xl font-black text-white uppercase tracking-tight">{title}</h3>
        <p className="text-zinc-500 text-sm leading-relaxed">{desc}</p>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 bg-black/40 px-5 py-2.5 rounded-xl border border-white/5">
          <span className="text-white font-black text-lg leading-none">{count}</span>
          <span className="text-zinc-600 font-black text-[10px] uppercase tracking-widest">Activos</span>
        </div>
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
          <ArrowRight size={20} />
        </div>
      </div>
    </button>
  );
}
