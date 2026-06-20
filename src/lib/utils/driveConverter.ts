/**
 * Convierte un enlace estándar de Google Drive (Docs o PDF) 
 * a su versión embebible a través de nuestro proxy interno.
 */
export function convertDriveUrl(url: string): string {
  if (!url) return "";

  // Extraer el ID del documento
  const match = url.match(/\/d\/(.*?)(\/|$)/);
  const fileId = match ? match[1] : null;

  if (!fileId) return url;

  // Si es un documento de Google Docs, usamos la vista previa minimalista
  if (url.includes("docs.google.com/document")) {
    return `https://docs.google.com/document/d/${fileId}/preview?rm=minimal`;
  }

  // Si es cualquier otro archivo en Google Drive (como un PDF)
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/**
 * Genera un enlace de descarga directa.
 */
export function getDownloadUrl(url: string): string {
  if (!url) return "";
  
  const match = url.match(/\/d\/(.*?)(\/|$)/);
  const fileId = match ? match[1] : null;

  if (!fileId) return url;

  if (url.includes("docs.google.com/document")) {
    return `https://docs.google.com/document/d/${fileId}/export?format=pdf`;
  }

  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}
