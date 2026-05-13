import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import DocViewer from '@/components/ui/DocViewer';
import { MasterServerService } from '@/services/supabase/master.server.service';

export default async function DocumentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  let doc: any = await MasterServerService.getDocumentoSistemaByClave(supabase, slug);

  let backUrl = '/bienvenida';

  // 2. Si no está en sistemas, buscar en documentos_combate
  if (!doc) {
    const combatDoc = await MasterServerService.getDocumentoCombateByClave(supabase, slug);
    
    if (combatDoc) {
      doc = combatDoc;
      
      const getSlug = (val: any) => {
        if (!val) return null;
        if (Array.isArray(val)) return val[0]?.slug;
        return val.slug;
      };

      // 1. Intentar obtener slug de la rama directa o desde la sub-especialidad
      let ramaSlug = getSlug((combatDoc as any).ramas_clanes);
      const subSlug = getSlug((combatDoc as any).sub_especialidades);

      // Si no hay rama directa, mirar si la sub-especialidad la tiene (join anidado)
      if (!ramaSlug && (combatDoc as any).sub_especialidades) {
        const subData = Array.isArray((combatDoc as any).sub_especialidades) 
          ? (combatDoc as any).sub_especialidades[0] 
          : (combatDoc as any).sub_especialidades;
        ramaSlug = getSlug(subData.ramas_clanes);
      }

      if (ramaSlug && subSlug) {
        backUrl = `/ramas/${ramaSlug}/${subSlug}`;
      } else if (ramaSlug) {
        backUrl = `/ramas/${ramaSlug}`;
      } else {
        backUrl = '/ramas';
      }
    }
  } else {
    // Lógica para documentos de sistemas
    const backMapping: { [key: string]: string } = {
      'aldeas': '/aldeas',
      'ramas': '/ramas',
      'sistemas': '/sistemas',
      'general': '/documentos',
      'noticias': '/noticias',
      'bienvenida': '/bienvenida'
    };
    
    // Si es un documento de sistema pero tiene subcategoría con formato path, usarla
    if (doc.categoria === 'ramas' && doc.subcategoria && doc.subcategoria.includes('/')) {
        backUrl = `/ramas/${doc.subcategoria}`;
    } else {
        backUrl = backMapping[doc.categoria] || '/bienvenida';
    }
  }

  if (!doc) return notFound();

  return (
    <DocViewer 
      title={doc.titulo} 
      url={doc.url_drive} 
      backUrl={backUrl}
    />
  );
}
