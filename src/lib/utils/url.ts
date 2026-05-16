/**
 * Obtiene la URL base del sitio de forma dinámica, 
 * funcionando tanto en local como en Vercel.
 */
export const getURL = () => {
  // 1. Si estamos en el navegador, window.location.origin es lo más fiable
  if (typeof window !== 'undefined') {
    return window.location.origin.endsWith('/') 
      ? window.location.origin 
      : `${window.location.origin}/`;
  }

  // 2. Fallback para SSR o entornos sin window
  let url =
    process?.env?.NEXT_PUBLIC_APP_URL ??
    process?.env?.NEXT_PUBLIC_VERCEL_URL ??
    'http://localhost:3000/';
    
  url = url.includes('http') ? url : `https://${url}`;
  url = url.endsWith('/') ? url : `${url}/`;
  
  return url;
};
