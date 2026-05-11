import { createClient } from '@/utils/supabase/server';
import { Map, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import AldeaList from '@/components/admin/AldeaList';

export default async function AdminAldeasPage() {
  const supabase = await createClient();
  
  const { data: aldeas } = await supabase
    .from('aldeas')
    .select('*')
    .order('id', { ascending: true });

  return (
    <div className="min-h-screen bg-black pt-24 pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <Link href="/admin" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-4 text-xs font-black uppercase tracking-widest group">
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver al panel
            </Link>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase flex items-center gap-4">
              <Map className="w-10 h-10 text-emerald-500" />
              GESTIÓN DE ALDEAS
            </h1>
          </div>
        </div>

        <AldeaList initialAldeas={aldeas || []} />
      </div>
    </div>
  );
}
