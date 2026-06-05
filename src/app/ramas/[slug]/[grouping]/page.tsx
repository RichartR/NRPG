import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { ScrollText } from 'lucide-react';
import { MasterServerService } from '@/services/supabase/master.server.service';
import Breadcrumbs, { CrumbItem } from '@/components/ui/Breadcrumbs';
import NinjaCard from '@/components/ui/NinjaCard';

export default async function GroupingDetailPage({ params }: { params: Promise<{ slug: string, grouping: string }> }) {
  const { slug, grouping } = await params;
  const supabase = await createClient();

  const rama = await MasterServerService.getRamaBySlug(supabase, slug);
  if (!rama) return notFound();

  const sub = await MasterServerService.getSubEspecialidadBySlug(supabase, rama.id, grouping);
  if (!sub) return notFound();

  const documentos = await MasterServerService.getDocumentosCombateBySubEspecialidad(supabase, sub.id);

  const breadcrumbsItems: CrumbItem[] = [
    { label: 'Inicio', href: '/' },
    { label: 'Biblioteca', href: '/documentos' },
  ];

  if (rama.tipo === 'clan' && rama.info_aldeas) {
    breadcrumbsItems.push({ label: 'Aldeas y Organizaciones', href: '/aldeas' });
    breadcrumbsItems.push({
      label: rama.info_aldeas.abreviatura || (rama.info_aldeas as any).nombre_completo,
      href: `/aldeas/${rama.info_aldeas.slug}`
    });
  } else {
    breadcrumbsItems.push({ label: 'Ramas', href: '/ramas' });
  }

  breadcrumbsItems.push({ label: rama.nombre, href: `/ramas/${slug}` });
  breadcrumbsItems.push({ label: sub.nombre });

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 flex flex-col">
      <header className="w-full max-w-[1750px] mx-auto flex flex-col md:flex-row justify-between items-center gap-10 mb-16 ninja-card-oro p-8 xl:p-12 z-50">
        <Breadcrumbs items={breadcrumbsItems} />
        <div className="flex items-center gap-4">
          <img src="/assets/icons/shuriken.png" className="w-4 xl:w-6 h-auto" alt="icon" />
          <h1 className="text-xl xl:text-2xl font-black text-oro uppercase tracking-[0.3em]">
            ARCHIVO DE <span className="text-oro/40">DOCTRINA</span>
          </h1>
        </div>
      </header>

      <main className="w-full max-w-[1750px] mx-auto flex-1">
        <div className="mb-16 ninja-card-oro p-12 xl:p-16 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
            <img src="/assets/icons/shuriken.png" className="w-64 h-64 rotate-12" alt="bg" />
          </div>
          <div className="flex items-center gap-6 mb-8 relative z-10">
            <h1 className="ninja-title text-6xl xl:text-9xl">{sub.nombre}</h1>
          </div>
          <p className="text-gris-texto text-xl xl:text-3xl max-w-4xl leading-relaxed italic relative z-10">
            &quot;{sub.descripcion}&quot;
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 xl:gap-16">
          {documentos.map((doc) => (
            <NinjaCard
              key={doc.id}
              href={`/docs/${doc.clave}`}
              title={doc.titulo}
              category="PERGAMINO TÉCNICO"
              imageUrl={doc.url_imagen || 'https://game.gtimg.cn/images/hyrz/web2026/content.jpg'}
              description={doc.descripcion || 'Pergamino de doctrina secreta y técnicas de combate.'}
              actionText="Leer Pergamino"
              titleClassName="text-2xl sm:text-3xl md:text-4xl"
              headerOverlayRight={
                <div className="w-10 h-10 bg-black/60 border border-oro/20 flex items-center justify-center ninja-clip-sm">
                  <ScrollText className="w-5 h-5 text-oro" />
                </div>
              }
            />
          ))}

          {documentos.length === 0 && (
            <div className="col-span-full text-center py-40 ninja-card-oro opacity-40">
              <p className="text-oro/40 font-black uppercase tracking-[0.6em] text-xl xl:text-2xl italic">ARCHIVOS NO DISPONIBLES</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
