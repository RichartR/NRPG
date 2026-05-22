import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { Map } from 'lucide-react';
import { MasterServerService } from '@/services/supabase/master.server.service';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import NinjaCard from '@/components/ui/NinjaCard';

export default async function AldeaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const aldea = await MasterServerService.getAldeaBySlug(supabase, slug);
  if (!aldea) return notFound();

  const clanes = await MasterServerService.getClanesByAldeaId(supabase, aldea.id);

  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-12 flex flex-col">
      <header className="w-full max-w-[1750px] mx-auto flex flex-col md:flex-row justify-between items-center gap-10 mb-10 ninja-card-oro p-8 xl:p-10 z-50">
        <Breadcrumbs 
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Biblioteca', href: '/documentos' },
            { label: 'Aldeas y Organizaciones', href: '/aldeas' },
            { label: aldea.abreviatura || aldea.nombre_completo }
          ]} 
        />
        <div className="flex items-center gap-4">
          <Map className="w-5 xl:w-7 h-auto text-oro" />
          <h1 className="text-xl xl:text-2xl font-black text-oro uppercase tracking-[0.3em]">
            Archivo de <span className="text-oro/40">Aldea</span>
          </h1>
        </div>
      </header>

      <main className="w-full max-w-[1750px] mx-auto flex-1">
        <div className="relative h-[400px] xl:h-[500px] overflow-hidden ninja-card-oro mb-16">
          {aldea.url_imagen && (
            <img 
              src={aldea.url_imagen} 
              alt="" 
              className="w-full h-full object-cover opacity-90 transition-all duration-1000"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute bottom-12 left-12 z-10">
            <h1 className="ninja-title text-6xl xl:text-9xl leading-none mb-4 tracking-tighter">
              {aldea.abreviatura || aldea.nombre_jap}
            </h1>
            <p className="text-oro/80 text-xl xl:text-3xl font-black tracking-widest uppercase italic">
              {aldea.nombre_completo || aldea.nombre_jap}
            </p>
          </div>
        </div>

        <div className="mb-16">
          <div className="flex items-center gap-4 mb-10">
            <h2 className="ninja-title text-4xl xl:text-6xl">Clanes y Especialidades</h2>
          </div>
          
          {clanes && clanes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 xl:gap-16">
              {clanes.map((clan) => (
                <NinjaCard
                  key={clan.id}
                  href={`/ramas/${clan.slug}`}
                  title={clan.nombre}
                  titleClassName="text-2xl sm:text-3xl md:text-4xl"
                  category={clan.tipo === 'clan' ? 'CLAN' : clan.tipo === 'rama' ? 'RAMA' : 'ESPECIALIDAD'}
                  imageUrl={clan.url_imagen || 'https://game.gtimg.cn/images/hyrz/web2026/content.jpg'}
                  description={clan.descripcion}
                  actionText="Explorar Clan"
                />
              ))}
            </div>
          ) : (
            <div className="ninja-card-oro p-20 text-center opacity-40">
               <h3 className="text-oro font-black uppercase tracking-widest text-2xl">Archivos no disponibles</h3>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
