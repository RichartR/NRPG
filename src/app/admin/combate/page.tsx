import { createClient } from '@/utils/supabase/server';
import { Sword, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import CombateList from '@/components/admin/CombateList';
import { MasterServerService } from '@/services/supabase/master.server.service';

export default async function AdminCombatePage() {
  const supabase = await createClient();
  
  const [docs, ramas, subEspecialidades] = await Promise.all([
    MasterServerService.getAdminDocumentosCombate(supabase),
    MasterServerService.getAdminRamasActivas(supabase),
    MasterServerService.getAdminSubEspecialidadesActivas(supabase)
  ]);

  return (
    <div className="min-h-screen bg-black pt-24 pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <Link href="/admin" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-4 text-xs font-black uppercase tracking-widest group">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver al panel
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase flex items-center gap-4">
              <Sword className="w-10 h-10 text-red-500" />
              Documentos
            </h1>
          </div>
        </header>

        <CombateList 
          initialDocs={docs} 
          ramas={ramas} 
          subEspecialidades={subEspecialidades} 
        />
      </div>
    </div>
  );
}
