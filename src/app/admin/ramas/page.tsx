import { createClient } from '@/utils/supabase/server';
import { GitBranch, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import RamaList from '@/components/admin/RamaList';
import SubEspecialidadList from '@/components/admin/SubEspecialidadList';

export default async function AdminRamasPage() {
  const supabase = await createClient();
  
  // 1. Obtener todas las ramas/clanes
  const { data: ramas } = await supabase
    .from('ramas_clanes')
    .select('*, aldeas(id, nombre_jap, abreviatura)')
    .order('tipo', { ascending: false })
    .order('nombre', { ascending: true });

  // 2. Obtener lista de aldeas para el selector
  const { data: aldeas } = await supabase
    .from('aldeas')
    .select('id, nombre_jap, abreviatura')
    .eq('activo', true)
    .order('nombre_jap', { ascending: true });

  // 3. Obtener sub-especialidades
  const { data: subEspecialidades } = await supabase
    .from('sub_especialidades')
    .select('*')
    .order('nombre', { ascending: true });

  return (
    <div className="min-h-screen bg-black pt-24 pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <Link href="/admin" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-4 text-xs font-black uppercase tracking-widest group">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver al panel
          </Link>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase flex items-center gap-4">
            <GitBranch className="w-10 h-10 text-amber-500" />
            RAMAS Y CLANES
          </h1>
        </header>

        <RamaList initialRamas={ramas || []} aldeas={aldeas || []} />

        {/* Nuevo gestor de sub-categorías (Bujutsu, Shurikenjutsu, Katon, etc.) */}
        <SubEspecialidadList 
          initialSubs={subEspecialidades || []} 
          ramas={ramas || []} 
        />
      </div>
    </div>
  );
}
