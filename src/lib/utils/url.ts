/**
 * Obtiene la URL base del sitio de forma dinámica, 
 * funcionando tanto en local como en Vercel.
 */
export const getURL = () => {
  let url =
    process?.env?.NEXT_PUBLIC_APP_URL ?? // URL personalizada en Vercel
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // URL automática de Vercel
    'http://localhost:3000/';
    
  // Asegurar que incluya el protocolo
  url = url.includes('http') ? url : `https://${url}`;
  
  // Asegurar que termine en /
  url = url.endsWith('/') ? url : `${url}/`;
  
  return url;
};
