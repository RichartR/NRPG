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
    <div className="space-y-3">
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-oro/60 ml-1">{label}</label>
      <input 
        type={type} 
        value={value || ''} 
        disabled={disabled} 
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)} 
        className="w-full bg-black/40 border border-oro/10 px-6 py-4 text-oro font-black outline-none focus:border-oro/40 transition-all disabled:opacity-30 placeholder:text-oro/20 text-sm xl:text-base ninja-clip-sm" 
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
    <div className="space-y-3">
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-oro/60 ml-1">{label}</label>
      <div className="relative">
        <select 
          value={value || ''} 
          disabled={disabled} 
          onChange={(e) => onChange?.(e.target.value)} 
          className="w-full bg-black/40 border border-oro/10 px-6 py-4 text-oro font-black outline-none focus:border-oro/40 appearance-none disabled:opacity-30 text-sm xl:text-base ninja-clip-sm"
        >
          <option value="" className="bg-zinc-950 text-oro/40">{placeholder}</option>
          {options.map((o: any) => (
            <option key={o.value || o} value={o.value || o} className="bg-zinc-950 text-oro">
              {o.label || o}
            </option>
          ))}
        </select>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-oro/40">
          <div className="w-2 h-2 bg-oro/40 rotate-45" />
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
    <div className="space-y-3 relative" ref={containerRef}>
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-oro/60 ml-1">{label}</label>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-black/40 border border-oro/10 px-6 py-4 text-left text-oro font-black outline-none focus:border-oro/40 disabled:opacity-30 flex justify-between items-center transition-all text-sm xl:text-base ninja-clip-sm"
        >
          <span className={!selectedOption ? 'text-oro/20' : ''}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <div className={`w-2 h-2 bg-oro/40 rotate-45 transition-transform ${isOpen ? 'scale-125 brightness-125' : ''}`} />
        </button>

        {isOpen && (
          <div className="relative z-[100] w-full mt-4 bg-black/40 border border-oro/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in duration-200 ninja-clip-sm">
            <div className="p-4 border-b border-oro/10 bg-black/20">
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar por nombre..."
                className="w-full bg-black/40 border border-oro/10 px-4 py-3 text-sm text-oro outline-none focus:border-oro/40 transition-all font-black"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="max-h-80 overflow-y-auto custom-scrollbar bg-black/80 backdrop-blur-md">
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
                    className={`w-full text-left px-8 py-4 text-xs xl:text-sm font-black uppercase tracking-widest hover:bg-oro/10 hover:text-oro transition-all ${o.value == value ? 'bg-oro/10 text-oro' : 'text-oro/40'}`}
                  >
                    {o.label}
                  </button>
                ))
              ) : (
                <div className="px-8 py-10 text-[10px] text-oro/20 font-black uppercase tracking-widest text-center italic">Sin resultados</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

