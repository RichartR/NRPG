import { createClient } from '@/utils/supabase/server';
import { GitBranch, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import RamaManager from '@/components/admin/RamaManager';
import { MasterServerService } from '@/services/supabase/master.server.service';

export default async function AdminRamasPage() {
  const supabase = await createClient();
  
  const [ramas, aldeas, subEspecialidades, entrenamientos] = await Promise.all([
    MasterServerService.getAdminRamas(supabase),
    MasterServerService.getAldeasActivas(supabase),
    MasterServerService.getAdminSubEspecialidades(supabase),
    MasterServerService.getAdminEntrenamientos(supabase)
  ]);

  return (
    <div className="min-h-screen bg-black pt-24 pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <Link href="/admin" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-4 text-xs font-black uppercase tracking-widest group">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver al panel
          </Link>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase flex items-center gap-4">
            <GitBranch className="w-10 h-10 text-amber-500" />
            ADMINISTRACIÓN TÁCTICA
          </h1>
        </header>

        <RamaManager 
          initialRamas={ramas} 
          aldeas={aldeas} 
          initialSubs={subEspecialidades}
          initialEntrenamientos={entrenamientos}
        />
      </div>
    </div>
  );
}
