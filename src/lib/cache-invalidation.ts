import { revalidatePath, revalidateTag } from 'next/cache';

// Keep this list server-side: callers may name a domain, never an arbitrary path or tag.
export const cacheDomains = {
  aldeas: {
    tags: ['master-aldeas', 'master-ramas', 'master-character-counts'],
    paths: ['/', '/aldeas', '/aldeas/[slug]', '/mundo-ninja', '/mundo-ninja/[id]', '/mapa', '/glosario', '/ramas'],
  },
  ramas: {
    tags: ['master-ramas', 'master-subespecialidades', 'master-documentos'],
    paths: ['/ramas', '/ramas/[slug]', '/ramas/[slug]/[grouping]', '/aldeas/[slug]', '/glosario', '/docs/[slug]'],
  },
  documentos: {
    tags: ['master-documentos'],
    paths: ['/sistemas', '/bienvenida', '/documentos', '/docs/[slug]', '/ramas', '/ramas/[slug]', '/ramas/[slug]/[grouping]'],
  },
  glosario: {
    tags: ['master-glosario'],
    paths: ['/glosario'],
  },
  configuracion: {
    tags: ['master-configuracion'],
    paths: ['/glosario', '/mundo-ninja', '/mundo-ninja/[id]', '/mapa', '/aldeas/[slug]'],
  },
  registros: {
    tags: ['latest-registros'],
    paths: ['/'],
  },
} as const;

export type CacheDomain = keyof typeof cacheDomains;

export function invalidateCache(domain: CacheDomain) {
  const { tags, paths } = cacheDomains[domain];
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  for (const path of paths) {
    if (path.includes('[')) revalidatePath(path, 'page');
    else revalidatePath(path);
  }
}

export function invalidateCharacterListing(
  oldVillage: number | null,
  newVillage: number | null,
  options: { occupancyChanged?: boolean; recentChanged?: boolean } = {}
) {
  for (const id of new Set([oldVillage ?? 'renegados', newVillage ?? 'renegados'])) {
    revalidatePath(`/mundo-ninja/${id}`);
  }
  if (options.occupancyChanged) {
    revalidateTag('master-character-counts', { expire: 0 });
    revalidateTag('master-character-occupancy', { expire: 0 });
    revalidatePath('/mundo-ninja');
    revalidatePath('/glosario');
  }
  if (options.recentChanged) {
    revalidateTag('latest-characters', { expire: 0 });
    revalidatePath('/');
  }
}
