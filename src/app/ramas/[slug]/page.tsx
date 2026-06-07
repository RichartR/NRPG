import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { MasterServerService } from '@/services/supabase/master.server.service';
import Breadcrumbs, { CrumbItem } from '@/components/ui/Breadcrumbs';
import NinjaCard from '@/components/ui/NinjaCard';

export default async function RamaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const rama = await MasterServerService.getRamaBySlug(supabase, slug);
  if (!rama) return notFound();

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
          <img src="/assets/icons/shuriken.png" className="w-4 xl:w-6 h-auto" alt="icon" />
          <h1 className="text-xl xl:text-2xl font-black text-oro uppercase tracking-[0.3em]">
            Información <span className="text-oro/40">de Rama</span>
          </h1>
        </div>
      </header>

      <main className="w-full max-w-[1750px] mx-auto flex-1">
        <div className="mb-10 ninja-card-oro p-12 xl:p-16">
          <h1 className="ninja-title text-6xl xl:text-7xl">{rama.nombre}</h1>
        </div>

        {(() => {
          const filteredSubs = subEspecialidades.filter(sub => !sub.slug?.startsWith('ninjutsu-'));
          return filteredSubs.length > 0 && (
            <div className="mb-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 xl:gap-16">
                {filteredSubs.map((sub) => (
                  <NinjaCard
                    key={sub.id}
                    href={`/ramas/${slug}/${sub.slug}`}
                    title={sub.nombre}
                    category="RAMA"
                    imageUrl={sub.url_imagen}
                    description={sub.nombre_español || sub.descripcion || ''}
                    actionText="VER RAMA"
                    titleClassName="text-2xl sm:text-3xl md:text-3xl"
                  />
                ))}
              </div>
            </div>
          );
        })()}

        {documentos.length > 0 && (
          <div className="mb-10">
            <div className="mb-10 ninja-card-oro p-8 sm:p-10 xl:p-12">
              <div className="flex items-center gap-6">
                <h2 className="ninja-title text-4xl xl:text-6xl">Documentos</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 xl:gap-16">
              {documentos.map((doc) => (
                <NinjaCard
                  key={doc.id}
                  href={`/docs/${doc.clave}`}
                  title={doc.titulo}
                  category="DOCUMENTO"
                  imageUrl={doc.url_imagen}
                  description={doc.descripcion}
                  actionText="VER DOCUMENTO"
                  titleClassName="text-2xl sm:text-3xl md:text-4xl"
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
