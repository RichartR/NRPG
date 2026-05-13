import { createClient } from '@/utils/supabase/server';
import DocList from '@/components/admin/DocList';
import { Plus } from 'lucide-react';
import { MasterServerService } from '@/services/supabase/master.server.service';

export default async function AdminDocumentos() {
  const supabase = await createClient();
  
  const [docs, categories] = await Promise.all([
    MasterServerService.getAdminDocumentosSistemasExcludingCategory(supabase, 'sistemas'),
    MasterServerService.getCategoriaDocumentos(supabase)
  ]);

  return (
    <div className="max-w-5xl">
      <header className="mb-12">
        <h1 className="text-4xl font-black text-white tracking-tighter mb-2">Lore y Documentación</h1>
        <p className="text-zinc-500">Administra las Aldeas, Ramas de habilidades y guías de bienvenida.</p>
      </header>

      <DocList 
        initialDocs={docs} 
        categories={categories} 
        defaultCategory="sistemas"
      />
    </div>
  );
}
