import { createClient } from '@/utils/supabase/server';
import DocList from '@/components/admin/DocList';
import { Zap } from 'lucide-react';
import { MasterServerService } from '@/services/supabase/master.server.service';

export default async function AdminSistemas() {
  const supabase = await createClient();

  const [docs, categories] = await Promise.all([
    MasterServerService.getAdminDocumentosSistemasByCategories(supabase, ['sistemas', 'bienvenida']),
    MasterServerService.getCategoriaDocumentos(supabase, ['sistemas', 'bienvenida'])
  ]);

  return (
    <div className="max-w-5xl">
      <header className="mb-12">
        <div className="flex items-center gap-2 text-red-500 font-bold uppercase tracking-widest text-xs mb-4">
          <Zap className="w-4 h-4" />
          Módulo Técnico
        </div>
        <h1 className="text-4xl font-black text-white tracking-tighter mb-2">Sistemas de Juego</h1>
        <p className="text-zinc-500">Administra las mecánicas, calculadoras y guías técnicas de combate.</p>
      </header>

      <DocList 
        initialDocs={docs} 
        categories={categories} 
        defaultCategory="sistemas"
        showSubcategory={false}
      />
    </div>
  );
}
