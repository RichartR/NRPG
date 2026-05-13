import { createClient } from '@/utils/supabase/server';
import { Settings, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import ConfigManager from '@/components/admin/ConfigManager';
import { MasterServerService } from '@/services/supabase/master.server.service';

export default async function AdminConfigPage() {
  const supabase = await createClient();
  const configs = await MasterServerService.getAdminConfigs(supabase);

  return (
    <div className="min-h-screen bg-black pt-24 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <Link href="/admin" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-4 text-xs font-black uppercase tracking-widest group">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver al panel
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase flex items-center gap-4">
              <Settings className="w-10 h-10 text-emerald-500" />
              CONFIGURACIÓN DEL SISTEMA
            </h1>
          </div>
        </header>

        <ConfigManager initialConfigs={configs} />
      </div>
    </div>
  );
}
