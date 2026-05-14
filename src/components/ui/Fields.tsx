import React from 'react';

interface DataFieldProps {
  label: string;
  value?: any;
  onChange?: (val: string) => void;
  disabled?: boolean;
  type?: string;
  placeholder?: string;
}

export function DataField({ label, value, onChange, disabled, type = "text", placeholder }: DataFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">{label}</label>
      <input 
        type={type} 
        value={value || ''} 
        disabled={disabled} 
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)} 
        className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-emerald-500 transition-all disabled:opacity-50 placeholder:text-zinc-700" 
      />
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value?: any;
  options: { label: string; value: any }[] | string[];
  onChange?: (val: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function SelectField({ label, value, options, onChange, disabled, placeholder = "Seleccionar..." }: SelectFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">{label}</label>
      <div className="relative">
        <select 
          value={value || ''} 
          disabled={disabled} 
          onChange={(e) => onChange?.(e.target.value)} 
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-emerald-500 appearance-none disabled:opacity-50"
        >
          <option value="">{placeholder}</option>
          {options.map((o: any) => (
            <option key={o.value || o} value={o.value || o}>
              {o.label || o}
            </option>
          ))}
        </select>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600">
          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
        </div>
      </div>
    </div>
  );
}
export function SearchableSelect({ label, value, options, onChange, disabled, placeholder = "Buscar..." }: SelectFieldProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);

  const normalizedOptions = React.useMemo(() => 
    Array.isArray(options) 
      ? options.map(o => typeof o === 'string' ? { label: o, value: o } : o)
      : [],
    [options]
  );

  const filteredOptions = normalizedOptions.filter(o => 
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = normalizedOptions.find(o => o.value == value);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-2 relative" ref={containerRef}>
      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">{label}</label>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-left text-white font-bold outline-none focus:border-emerald-500 disabled:opacity-50 flex justify-between items-center transition-all"
        >
          <span className={!selectedOption ? 'text-zinc-700' : ''}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <svg className={`w-4 h-4 transition-transform text-zinc-600 ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
          </svg>
        </button>

        {isOpen && (
          <div className="absolute z-[100] w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-3 border-b border-zinc-800 bg-zinc-900/50">
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Escribe para filtrar..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-emerald-500 transition-all"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => {
                      onChange?.(o.value.toString());
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full text-left px-6 py-3 text-sm hover:bg-emerald-500/10 hover:text-emerald-500 transition-all ${o.value == value ? 'bg-emerald-500/5 text-emerald-500 font-bold' : 'text-zinc-400'}`}
                  >
                    {o.label}
                  </button>
                ))
              ) : (
                <div className="px-6 py-8 text-sm text-zinc-600 text-center italic">No se encontraron resultados</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
