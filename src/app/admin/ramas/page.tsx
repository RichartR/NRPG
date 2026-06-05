import { createClient } from '@/utils/supabase/server';
import { GitBranch } from 'lucide-react';
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
    <div className="max-w-[1750px]">
      <header className="mb-6 ninja-card-oro p-8 xl:p-10">
        <Link href="/admin" className="flex items-center gap-3 text-oro/40 hover:text-oro transition-all mb-8 text-caption font-black uppercase tracking-[0.3em] group">
          <div className="w-1.5 h-1.5 bg-oro/20 group-hover:bg-oro rotate-45 transition-colors" />
          VOLVER AL PANEL CENTRAL
        </Link>

        <div className="flex items-center gap-6">
          <div className="w-12 h-12 bg-oro/[0.03] border border-oro/10 flex items-center justify-center">
            <GitBranch className="w-6 h-6 text-oro" />
          </div>
          <div>
            <h1 className="ninja-title text-4xl xl:text-5xl italic">ADMINISTRACIÓN TÁCTICA</h1>
            <p className="text-oro/40 text-caption xl:text-xs font-black uppercase tracking-[0.4em] mt-2">CONFIGURACIÓN DE RAMAS, CLANES Y ESPECIALIDADES</p>
          </div>
        </div>
      </header>

      <RamaManager
        initialRamas={ramas}
        aldeas={aldeas}
        initialSubs={subEspecialidades}
        initialEntrenamientos={entrenamientos}
      />
    </div>
  );
}
