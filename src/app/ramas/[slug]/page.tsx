import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { GitBranch, ScrollText, ChevronRight } from 'lucide-react';
import { MasterServerService } from '@/services/supabase/master.server.service';
import Breadcrumbs, { CrumbItem } from '@/components/ui/Breadcrumbs';
import NinjaCard from '@/components/ui/NinjaCard';

export default async function RamaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const rama = await MasterServerService.getRamaBySlug(supabase, slug);
  if (!rama) return notFound();

  const backUrl = rama.tipo === 'clan' && rama.info_aldeas?.slug
    ? `/aldeas/${rama.info_aldeas.slug}`
    : '/ramas';

  const backText = rama.tipo === 'clan' && rama.info_aldeas?.abreviatura
    ? `Volver a ${rama.info_aldeas.abreviatura}`
    : 'Volver a Ramas';

  const [subEspecialidades, documentos] = await Promise.all([
    MasterServerService.getSubEspecialidadesByRama(supabase, rama.id),
    MasterServerService.getDocumentosCombateByRama(supabase, rama.id),
  ]);

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

  breadcrumbsItems.push({ label: rama.nombre });

  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-12 flex flex-col">
      <header className="w-full max-w-[1750px] mx-auto flex flex-col md:flex-row justify-between items-center gap-10 mb-10 ninja-card-oro p-8 xl:p-10 z-50">
        <Breadcrumbs items={breadcrumbsItems} />
        <div className="flex items-center gap-4">
          <GitBranch className="w-5 xl:w-7 h-auto text-oro" />
          <h1 className="text-xl xl:text-2xl font-black text-oro uppercase tracking-[0.3em]">
            Archivo de <span className="text-oro/40">Especialidad</span>
          </h1>
        </div>
      </header>

      <main className="w-full max-w-[1750px] mx-auto flex-1">
        <div className="mb-16 ninja-card-oro p-12 xl:p-16">
          <h1 className="ninja-title text-6xl xl:text-9xl mb-6">{rama.nombre}</h1>
          <p className="text-gris-texto text-xl xl:text-3xl italic leading-relaxed">
            "{rama.descripcion}"
          </p>
        </div>

        {subEspecialidades.length > 0 && (
          <div className="mb-20">
            <h2 className="ninja-title text-4xl xl:text-6xl mb-10">Sub-Especialidades</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 xl:gap-16">
              {subEspecialidades.map((sub) => (
                <NinjaCard
                  key={sub.id}
                  href={`/ramas/${slug}/${sub.slug}`}
                  title={sub.nombre}
                  category="SUB-ESPECIALIDAD"
                  imageUrl={sub.url_imagen || 'https://game.gtimg.cn/images/hyrz/web2026/player.jpg'}
                  description={sub.nombre_español || sub.descripcion || ''}
                  actionText="Ver Documento"
                  titleClassName="text-2xl sm:text-3xl md:text-4xl"
                />
              ))}
            </div>
          </div>
        )}

        {documentos.length > 0 && (
          <div className="mb-16">
            <h2 className="ninja-title text-4xl xl:text-6xl mb-10">Pergaminos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 xl:gap-12">
              {documentos.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/docs/${doc.clave}`}
                  className="group flex items-center justify-between p-10 ninja-card-oro hover-ninja transition-all relative overflow-hidden"
                >
                  <div className="flex items-center gap-8 relative z-10">
                    <div className="w-16 h-16 bg-oro/5 border border-oro/10 flex items-center justify-center group-hover:bg-oro transition-all duration-500 ninja-clip-md">
                      <ScrollText className="w-8 h-8 text-oro group-hover:text-rojo-sangre" />
                    </div>
                    <div>
                      <h4 className="ninja-title text-3xl xl:text-4xl group-hover:text-oro transition-colors italic leading-none mb-2">{doc.titulo}</h4>
                      <p className="text-oro/40 text-[10px] uppercase font-black tracking-widest">{doc.descripcion || 'Pergamino Técnico'}</p>
                    </div>
                  </div>
                  <div className="w-10 h-10 flex items-center justify-center border border-oro/20 text-oro group-hover:bg-oro group-hover:text-rojo-sangre transition-all">
                    <ChevronRight className="w-6 h-6" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
