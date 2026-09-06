import { notFound } from 'next/navigation';
import DocViewer from '@/components/ui/DocViewer';
import { MasterServerService } from '@/services/supabase/master.server.service';
import { CrumbItem } from '@/components/ui/Breadcrumbs';

export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}

export default async function DocumentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const breadcrumbsItems: CrumbItem[] = [
    { label: 'Inicio', href: '/' }
  ];

  // Helper para obtener campos de Supabase de manera limpia (soporte array/objeto)
  const getField = (val: any, field: string) => {
    if (!val) return null;
    if (Array.isArray(val)) return val[0]?.[field];
    return val[field];
  };

  // Helper para formatear slugs como fallback
  const formatSlug = (s: string) => {
    if (!s) return '';
    return s
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Obtener lista precargada en caché de servidor (1 sola consulta cada 10 min para toda la app)
  const allDocs = await MasterServerService.getCachedDocumentosNavList();
  const targetMeta = allDocs.find(d => d.clave === slug);

  let doc: any = null;
  let isCombat = false;

  // Consultar directamente la tabla precisa evitando cascadas y consultas redundantes
  if (targetMeta) {
    if (targetMeta.categoria === 'combate') {
      doc = await MasterServerService.getCachedDocumentoCombateByClave(slug);
      isCombat = true;
    } else {
      doc = await MasterServerService.getCachedDocumentoSistemaByClave(slug);
      isCombat = false;
    }
  } else {
    // Fallback para documentos recién creados que aún no estén en la caché de lista
    const combatDoc = await MasterServerService.getCachedDocumentoCombateByClave(slug);
    if (combatDoc) {
      doc = combatDoc;
      isCombat = true;
    } else {
      doc = await MasterServerService.getCachedDocumentoSistemaByClave(slug);
      isCombat = false;
    }
  }

  if (doc && isCombat) {
    const cDoc = doc as any;
    let ramaSlug = getField(cDoc.info_ramas_clanes, 'slug');
    let ramaName = getField(cDoc.info_ramas_clanes, 'nombre');
    let ramaTipo = getField(cDoc.info_ramas_clanes, 'tipo');
    let ramaInfoAldeas = getField(cDoc.info_ramas_clanes, 'info_aldeas');
    
    const subSlug = getField(cDoc.info_sub_especialidades, 'slug');
    const subName = getField(cDoc.info_sub_especialidades, 'nombre');

    if (!ramaSlug && cDoc.info_sub_especialidades) {
      const subData = Array.isArray(cDoc.info_sub_especialidades) 
        ? cDoc.info_sub_especialidades[0] 
        : cDoc.info_sub_especialidades;
      ramaSlug = getField(subData.info_ramas_clanes, 'slug');
      ramaName = getField(subData.info_ramas_clanes, 'nombre');
      ramaTipo = getField(subData.info_ramas_clanes, 'tipo');
      ramaInfoAldeas = getField(subData.info_ramas_clanes, 'info_aldeas');
    }

    breadcrumbsItems.push({ label: 'Biblioteca', href: '/documentos' });
    
    if (ramaSlug) {
      if (ramaTipo === 'clan' && ramaInfoAldeas) {
        breadcrumbsItems.push({ label: 'Aldeas y Organizaciones', href: '/aldeas' });
        const villageSlug = getField(ramaInfoAldeas, 'slug');
        const villageAbrev = getField(ramaInfoAldeas, 'abreviatura');
        const villageName = getField(ramaInfoAldeas, 'nombre_completo');
        breadcrumbsItems.push({ 
          label: villageAbrev || villageName || formatSlug(villageSlug), 
          href: `/aldeas/${villageSlug}` 
        });
      } else {
        breadcrumbsItems.push({ label: 'Ramas', href: '/ramas' });
      }
      breadcrumbsItems.push({ label: ramaName || formatSlug(ramaSlug), href: `/ramas/${ramaSlug}` });
    }

    if (subSlug && ramaSlug) {
      breadcrumbsItems.push({ label: subName || formatSlug(subSlug), href: `/ramas/${ramaSlug}/${subSlug}` });
    }
  } else if (doc) {
    if (doc.categoria === 'sistemas') {
      breadcrumbsItems.push({ label: 'Sistemas', href: '/sistemas' });
    } else if (doc.categoria === 'bienvenida') {
      breadcrumbsItems.push({ label: 'Bienvenida', href: '/bienvenida' });
    } else if (doc.categoria === 'general') {
      breadcrumbsItems.push({ label: 'Biblioteca', href: '/documentos' });
    } else if (doc.categoria === 'aldeas') {
      breadcrumbsItems.push({ label: 'Biblioteca', href: '/documentos' });
      breadcrumbsItems.push({ label: 'Aldeas y Organizaciones', href: '/aldeas' });
    } else if (doc.categoria === 'ramas') {
      breadcrumbsItems.push({ label: 'Biblioteca', href: '/documentos' });
      breadcrumbsItems.push({ label: 'Ramas', href: '/ramas' });
      if (doc.subcategoria) {
        const parts = doc.subcategoria.split('/');
        const branchSlug = parts[parts.length - 1];
        breadcrumbsItems.push({ 
          label: formatSlug(branchSlug), 
          href: `/ramas/${doc.subcategoria}` 
        });
      }
    }
  }

  if (!doc) return notFound();

  breadcrumbsItems.push({ label: doc.titulo });

  return (
    <DocViewer 
      title={doc.titulo}
      url={doc.url_drive}
      initialDoc={{
        clave: doc.clave || slug,
        titulo: doc.titulo,
        url_drive: doc.url_drive,
        categoria: doc.categoria || 'documento'
      }}
      allDocs={allDocs}
      breadcrumbs={breadcrumbsItems}
    />
  );
}
