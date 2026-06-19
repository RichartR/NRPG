'use client';

import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { DocumentoCombate } from '@/domain/types';
import { searchIncludes } from '@/lib/utils/search';
import NinjaCard from '@/components/ui/NinjaCard';

interface DocumentosCombateSearchProps {
  documentos: DocumentoCombate[];
}

export default function DocumentosCombateSearch({ documentos }: DocumentosCombateSearchProps) {
  const [search, setSearch] = useState('');

  const filteredDocs = useMemo(() => {
    if (!search.trim()) return documentos;
    return documentos.filter((doc) => searchIncludes(doc.titulo, search));
  }, [documentos, search]);

  return (
    <div className="mb-10">
      <div className="mb-10 ninja-card-oro p-8 sm:p-10 xl:p-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-6">
          <h2 className="ninja-title text-4xl xl:text-6xl">Documentos</h2>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-oro/40 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar documento por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/60 border border-oro/20 focus:border-oro/60 focus:ring-1 focus:ring-oro/20 pl-12 pr-10 py-3 text-xs font-black uppercase tracking-widest text-oro placeholder:text-oro/20 outline-none transition-all"
            style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center hover:brightness-125 text-oro/40 hover:text-oro transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {filteredDocs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 xl:gap-16">
          {filteredDocs.map((doc) => (
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
      ) : (
        <div className="py-24 text-center ninja-card-oro opacity-40">
          <p className="text-oro/40 font-black uppercase tracking-[0.4em] text-lg sm:text-xl italic">
            NO SE ENCONTRARON DOCUMENTOS
          </p>
        </div>
      )}
    </div>
  );
}
