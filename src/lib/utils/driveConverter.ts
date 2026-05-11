/**
 * Convierte un enlace estándar de Google Drive (Docs o PDF) 
 * a su versión embebible / vista previa.
 */
export function convertDriveUrl(url: string): string {
  if (!url) return "";

  // Caso 1: Google Docs (/edit -> /preview)
  if (url.includes("docs.google.com/document")) {
    const baseUrl = url.replace(/\/edit.*$/, "/preview").replace(/\/view.*$/, "/preview");
    return `${baseUrl}?rm=minimal&embedded=true`;
  }

  // Caso 2: Google Drive File Sharing (/view -> /preview)
  if (url.includes("drive.google.com/file")) {
    const baseUrl = url.replace(/\/view.*$/, "/preview").replace(/\/edit.*$/, "/preview");
    return `${baseUrl}?rm=minimal&embedded=true`;
  }

  return url;
}

/**
 * Genera un enlace de descarga directa.
 */
export function getDownloadUrl(url: string): string {
  if (!url) return "";
  
  // Extraer el ID del documento
  const match = url.match(/\/d\/(.*?)(\/|$)/);
  const fileId = match ? match[1] : null;

  if (!fileId) return url;

  if (url.includes("docs.google.com/document")) {
    return `https://docs.google.com/document/d/${fileId}/export?format=pdf`;
  }

  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}
