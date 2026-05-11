import { createClient } from '@/utils/supabase/server';
import DocList from '@/components/admin/DocList';
import { Plus } from 'lucide-react';

export default async function AdminDocumentos() {
  const supabase = await createClient();
  
  // Obtener documentos (excepto sistemas) y categorías en paralelo
  const [docsResponse, categoriesResponse] = await Promise.all([
    supabase
      .from('documentos_sistemas')
      .select('*')
      .neq('categoria', 'sistemas')
      .order('categoria', { ascending: true })
      .order('titulo', { ascending: true }),
    supabase
      .from('categorias_documentos')
      .select('*')
      .order('nombre', { ascending: true })
  ]);

  const docs = docsResponse.data;
  const categories = categoriesResponse.data;

  return (
    <div className="max-w-5xl">
      <header className="mb-12">
        <h1 className="text-4xl font-black text-white tracking-tighter mb-2">Lore y Documentación</h1>
        <p className="text-zinc-500">Administra las Aldeas, Ramas de habilidades y guías de bienvenida.</p>
      </header>

      <DocList 
        initialDocs={docs || []} 
        categories={categories || []} 
        defaultCategory="sistemas"
      />
    </div>
  );
}
