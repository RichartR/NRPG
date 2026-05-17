'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';

interface NinjaSearchInputProps {
  placeholder?: string;
  isRenegado?: boolean;
}

export function NinjaSearchInput({ placeholder = "Buscar shinobi por nombre...", isRenegado = false }: NinjaSearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const initialQuery = searchParams.get('search') || '';
  const [query, setQuery] = useState(initialQuery);

  // Sincronizar el input si cambia el parámetro en la URL por otra acción
  useEffect(() => {
    setQuery(searchParams.get('search') || '');
  }, [searchParams]);

  const handleSearch = (val: string) => {
    setQuery(val);
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set('search', val);
    } else {
      params.delete('search');
    }
    // Siempre reiniciar a la página 1 cuando el usuario busca o filtra
    params.set('page', '1');
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Search className={`w-4 h-4 ${isRenegado ? 'text-rojo-sangre/40' : 'text-oro/40'}`} />
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-black/80 border ${
          isRenegado 
            ? 'border-rojo-sangre/20 focus:border-rojo-sangre/60 focus:ring-1 focus:ring-rojo-sangre/20' 
            : 'border-oro/20 focus:border-oro/60 focus:ring-1 focus:ring-oro/20'
        } pl-12 pr-10 py-3 text-xs font-black uppercase tracking-widest text-oro placeholder:text-oro/20 outline-none transition-all`}
        style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
      />
      {query && (
        <button
          onClick={() => handleSearch('')}
          className="absolute inset-y-0 right-0 pr-4 flex items-center hover:brightness-125 text-oro/40 hover:text-oro transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
