/** Local WebP emblems for the five great nations (slug → public path). */
const SLUG_TO_LOGO: Record<string, string> = {
  konoha: '/assets/logos_aldeas/konoha.webp',
  suna: '/assets/logos_aldeas/suna.webp',
  kiri: '/assets/logos_aldeas/kiri.webp',
  kumo: '/assets/logos_aldeas/kumo.webp',
  iwa: '/assets/logos_aldeas/iwa.webp',
};

export function resolveAldeaIcono(aldea: {
  slug?: string | null;
  url_icono?: string | null;
}): string | null {
  if (aldea.url_icono) return aldea.url_icono;
  if (aldea.slug && SLUG_TO_LOGO[aldea.slug]) return SLUG_TO_LOGO[aldea.slug];
  return null;
}
