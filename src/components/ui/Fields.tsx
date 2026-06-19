'use client';
import React from 'react';
import { Lock, ChevronDown, Search, Check, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { searchIncludes } from '@/lib/utils/search';

export const FormEditContext = React.createContext<{ isEditing?: boolean }>({ isEditing: true });

// ─────────────────────────────────────────────
//  DataField
// ─────────────────────────────────────────────
interface DataFieldProps {
  label: string;
  value?: any;
  onChange?: (val: string) => void;
  disabled?: boolean;
  type?: string;
  placeholder?: string;
}

export function DataField({ label, value, onChange, disabled, type = "text", placeholder }: DataFieldProps) {
  const { isEditing = true } = React.useContext(FormEditContext);
  const showLock = disabled && isEditing;
  return (
    <div className="space-y-3">
      <label className="text-caption font-black uppercase tracking-[0.2em] text-oro/60 ml-1">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value || ''}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange?.(e.target.value)}
          className={`w-full h-[58px] bg-black/40 border border-oro/10 px-6 py-4 text-oro font-black outline-none focus:border-oro/40 transition-all disabled:cursor-default placeholder:text-oro/20 text-sm xl:text-base ninja-clip-sm ${showLock ? 'pr-12' : ''}`}
        />
        {showLock && (
          <Lock className="w-3.5 h-3.5 text-oro/40 absolute right-5 top-1/2 -translate-y-1/2" />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  NinjaSelect — selector premium con portal
//  El dropdown se renderiza en document.body para
//  escapar de clip-path / overflow-hidden padres.
// ─────────────────────────────────────────────
export interface NinjaSelectOption {
  label: string;
  value: any;
  disabled?: boolean;
}

export interface NinjaSelectProps {
  value?: any;
  options: NinjaSelectOption[] | string[];
  onChange?: (val: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** default = formularios | filter = barras de filtro | inline = dentro de contenedores */
  variant?: 'default' | 'filter' | 'inline';
  className?: string;
}

export function NinjaSelect({
  value,
  options,
  onChange,
  disabled,
  placeholder = 'Seleccionar...',
  variant = 'default',
  className = '',
}: NinjaSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({});
  const [mounted, setMounted] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const { isEditing = true } = React.useContext(FormEditContext);
  const showLock = disabled && isEditing;

  // Necesario para SSR (Next.js): el portal solo existe en el cliente
  React.useEffect(() => { setMounted(true); }, []);

  const normalizedOptions: NinjaSelectOption[] = React.useMemo(() =>
    Array.isArray(options)
      ? options.map(o => (typeof o === 'string' ? { label: o, value: o } : o as NinjaSelectOption))
      : [],
    [options]
  );

  const selectedOption = normalizedOptions.find(o => String(o.value) === String(value));

  /** Calcula la posición fixed del dropdown y abre */
  const openDropdown = () => {
    if (disabled || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const estimatedHeight = Math.min(260, normalizedOptions.length * 44 + 56);
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
    const maxW = Math.max(rect.width, Math.min(350, window.innerWidth - rect.left - 16));

    setDropdownStyle(
      openUp
        ? { position: 'fixed', left: rect.left, bottom: window.innerHeight - rect.top + 4, minWidth: rect.width, width: 'max-content', maxWidth: maxW, zIndex: 9999 }
        : { position: 'fixed', left: rect.left, top: rect.bottom + 4, minWidth: rect.width, width: 'max-content', maxWidth: maxW, zIndex: 9999 }
    );
    setIsOpen(true);
  };

  // Cierra el dropdown al hacer click fuera, scroll externo, o resize
  React.useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      // No cerrar si el click es dentro del dropdown o del trigger
      if (
        dropdownRef.current?.contains(e.target as Node) ||
        triggerRef.current?.contains(e.target as Node)
      ) return;
      setIsOpen(false);
    };

    const handleScroll = (e: Event) => {
      // No cerrar si el scroll ocurre dentro del dropdown
      if (dropdownRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
    };

    const handleResize = () => setIsOpen(false);

    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setIsOpen(false);
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      isOpen ? setIsOpen(false) : openDropdown();
    }
  };

  const triggerClass = {
    default: 'h-[58px] bg-black/40 border border-oro/10 px-6 py-4 text-sm xl:text-base hover:border-oro/40 hover:bg-black/70 focus:border-oro/60 ninja-clip-sm',
    filter:  'bg-black/20 border border-oro/10 px-6 py-3 text-xs hover:border-oro/30 focus:border-oro/40 ninja-clip-xs',
    inline:  'bg-transparent border border-oro/10 px-4 py-3 text-xs hover:border-oro/20 focus:border-oro/30',
  }[variant];

  // El dropdown como portal — escapa de cualquier overflow/clip-path padre
  const dropdown = mounted && isOpen
    ? createPortal(
        <div
          ref={dropdownRef}
          style={{
            ...dropdownStyle,
            clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
          }}
          onMouseDown={(e) => e.stopPropagation()}
          role="listbox"
          className="bg-neutral-900 border border-oro/25 shadow-[0_10px_40px_rgba(0,0,0,0.9)] backdrop-blur-md overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Línea oro superior */}
          <div className="h-[1px] bg-gradient-to-r from-transparent via-oro/40 to-transparent" />

          <div className="max-h-64 overflow-y-auto overflow-x-hidden custom-scrollbar">
            {/* Opción vacía/placeholder */}
            <button
              role="option"
              type="button"
              onClick={() => { onChange?.(''); setIsOpen(false); }}
              className="w-full text-left px-6 py-3 text-caption font-black uppercase tracking-widest text-oro/30 hover:bg-oro/5 hover:text-oro/50 transition-all border-b border-oro/5"
            >
              {placeholder}
            </button>

            {normalizedOptions.map((o) => {
              const isSelected = String(o.value) === String(value);
              return (
                <button
                  role="option"
                  key={String(o.value)}
                  type="button"
                  disabled={o.disabled}
                  aria-selected={isSelected}
                  onClick={() => {
                    if (!o.disabled) { onChange?.(String(o.value)); setIsOpen(false); }
                  }}
                  className={`
                    w-full text-left px-6 py-3 text-caption xl:text-xs font-black uppercase tracking-widest
                    transition-all duration-150 border-b border-oro/[0.04] last:border-0
                    flex items-center justify-between gap-4
                    ${o.disabled
                      ? 'text-zinc-600 line-through cursor-not-allowed'
                      : isSelected
                        ? 'bg-oro/10 text-oro hover:bg-oro/15'
                        : 'text-oro/50 hover:bg-oro/8 hover:text-oro'
                    }
                  `}
                >
                  {o.label.includes('\n') ? (
                    <div className="flex flex-col text-left py-0.5 min-w-0">
                      <span className="text-caption xl:text-xs font-black text-oro truncate">{o.label.split('\n')[0]}</span>
                      <span className="text-caption xl:text-caption font-bold text-oro/40 lowercase tracking-wider mt-0.5 block">{o.label.split('\n')[1]}</span>
                    </div>
                  ) : (
                    <span>{o.label}</span>
                  )}
                  {isSelected && <div className="shrink-0 w-[5px] h-[5px] bg-oro rotate-45" />}
                </button>
              );
            })}
          </div>

          {/* Línea oro inferior */}
          <div className="h-[1px] bg-gradient-to-r from-transparent via-oro/20 to-transparent" />
        </div>,
        document.body
      )
    : null;

  return (
    <div className={`relative ${className}`}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={(e) => { e.stopPropagation(); isOpen ? setIsOpen(false) : openDropdown(); }}
        onKeyDown={handleKeyDown}
        className={`
          w-full flex justify-between items-center gap-4
          font-black text-oro uppercase tracking-[0.15em] outline-none
          transition-all duration-200 cursor-pointer
          disabled:cursor-default
          ${triggerClass}
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`truncate ${!selectedOption ? 'text-oro/30' : 'text-oro'} w-full text-left`}>
          {selectedOption ? (
            selectedOption.label.includes('\n') ? (
              <span className="flex flex-col items-start gap-0.5 leading-tight py-0.5 min-w-0">
                <span className="text-sm xl:text-base font-black text-oro truncate block w-full">{selectedOption.label.split('\n')[0]}</span>
                <span className="text-caption xl:text-caption font-bold text-oro/40 lowercase tracking-wider block">{selectedOption.label.split('\n')[1]}</span>
              </span>
            ) : (
              selectedOption.label
            )
          ) : placeholder}
        </span>
        {/* Diamante indicador o Candado si está deshabilitado */}
        {showLock ? (
          <Lock className="shrink-0 w-3.5 h-3.5 text-oro/40" />
        ) : (
          <div className={`shrink-0 w-[7px] h-[7px] border border-oro/60 rotate-45 transition-all duration-200 ${isOpen ? 'scale-125 bg-oro/30 border-oro/80' : 'bg-transparent'}`} />
        )}
      </button>

      {dropdown}
    </div>
  );
}

// ─────────────────────────────────────────────
//  SelectField — usa NinjaSelect internamente
// ─────────────────────────────────────────────
interface SelectFieldProps {
  label: string;
  value?: any;
  options: { label: string; value: any; disabled?: boolean }[] | string[];
  onChange?: (val: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function SelectField({ label, value, options, onChange, disabled, placeholder = 'Seleccionar...' }: SelectFieldProps) {
  return (
    <div className="space-y-3">
      <label className="text-caption font-black uppercase tracking-[0.2em] text-oro/60 ml-1">{label}</label>
      <NinjaSelect
        value={value}
        options={options}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        variant="default"
      />
    </div>
  );
}

// ─────────────────────────────────────────────
//  SearchableSelect (versión con portal)
// ─────────────────────────────────────────────
export function SearchableSelect({ label, value, options, onChange, disabled, placeholder = 'Buscar...' }: SelectFieldProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [dropdownStyle, setDropdownStyle] = React.useState({});
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const { isEditing = true } = React.useContext(FormEditContext);
  const showLock = disabled && isEditing;

  const normalizedOptions = React.useMemo(() =>
    Array.isArray(options)
      ? options.map(o => (typeof o === 'string' ? { label: o, value: o } : o as NinjaSelectOption))
      : [],
    [options]
  );

  const filteredOptions = normalizedOptions.filter(o => searchIncludes(o.label, search));

  const selectedOption = normalizedOptions.find(o => String(o.value) === String(value));

  const openDropdown = () => {
    if (disabled || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const estimatedHeight = 330;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
    const maxW = Math.max(rect.width, Math.min(350, window.innerWidth - rect.left - 16));

    setDropdownStyle(
      openUp
        ? { position: 'fixed', left: rect.left, bottom: window.innerHeight - rect.top + 4, minWidth: rect.width, width: 'max-content', maxWidth: maxW, zIndex: 9999 }
        : { position: 'fixed', left: rect.left, top: rect.bottom + 4, minWidth: rect.width, width: 'max-content', maxWidth: maxW, zIndex: 9999 }
    );
    setIsOpen(true);
  };

  React.useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (dropdownRef.current?.contains(e.target as Node) || triggerRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
    };
    const handleScroll = () => setIsOpen(false);
    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  return (
    <div className="space-y-3 relative">
      <label className="text-caption font-black uppercase tracking-[0.2em] text-oro/60 ml-1">{label}</label>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => isOpen ? setIsOpen(false) : openDropdown()}
        className="w-full h-[58px] bg-black/40 border border-oro/10 px-6 py-4 text-left text-oro font-black outline-none focus:border-oro/40 disabled:cursor-default flex justify-between items-center transition-all text-sm xl:text-base ninja-clip-sm"
      >
        <span className={`${!selectedOption ? 'text-oro/20' : ''} w-full text-left truncate`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        {showLock ? (
          <Lock className="shrink-0 w-3.5 h-3.5 text-oro/40" />
        ) : (
          <div className={`w-[7px] h-[7px] border border-oro/60 rotate-45 transition-transform ${isOpen ? 'scale-125 bg-oro/30' : ''}`} />
        )}
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={{ ...dropdownStyle }}
          className="z-[9999] bg-black/95 border border-oro/20 shadow-[0_10px_30px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in duration-200 ninja-clip-sm backdrop-blur-md"
        >
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
          <div className="max-h-64 overflow-y-auto overflow-x-hidden custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((o) => (
                <button
                  key={String(o.value)}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange?.(String(o.value));
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full text-left px-8 py-4 text-xs xl:text-sm font-black uppercase tracking-widest hover:bg-oro/10 hover:text-oro transition-all ${String(o.value) === String(value) ? 'bg-oro/10 text-oro' : 'text-oro/40'}`}
                >
                  {o.label.includes('\n') ? (
                    <div className="flex flex-col text-left py-0.5 min-w-0">
                      <span className="text-xs xl:text-sm font-black text-oro truncate block w-full">{o.label.split('\n')[0]}</span>
                      <span className="text-caption xl:text-caption font-bold text-oro/40 lowercase tracking-wider mt-0.5 block">{o.label.split('\n')[1]}</span>
                    </div>
                  ) : (
                    o.label
                  )}
                </button>
              ))
            ) : (
              <div className="px-8 py-10 text-caption text-oro/20 font-black uppercase tracking-widest text-center italic">Sin resultados</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  SearchableMultiSelect (versión con portal)
// ─────────────────────────────────────────────
interface SearchableMultiSelectProps {
  label: string;
  value?: any;
  options: { label: string; value?: any; id?: any }[];
  onChange?: (val: any) => void;
  disabled?: boolean;
  placeholder?: string;
  icon?: React.ReactNode;
}

export function SearchableMultiSelect({
  label,
  value,
  options,
  onChange,
  disabled,
  placeholder = 'Seleccionar...',
  icon
}: SearchableMultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({});
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const selectedIds: any[] = React.useMemo(() => {
    if (Array.isArray(value)) return value.map(id => (typeof id === 'number' ? id : String(id)));
    if (value !== undefined && value !== null && value !== '') return [typeof value === 'number' ? value : String(value)];
    return [];
  }, [value]);

  const selectedOptions = React.useMemo(() => {
    return options.filter((o: any) => {
      const optId = o.value !== undefined ? o.value : o.id;
      return selectedIds.includes(typeof optId === 'number' ? optId : String(optId));
    });
  }, [options, selectedIds]);

  const filteredOptions = React.useMemo(() => {
    return options.filter((o: any) => searchIncludes(o.label, search));
  }, [options, search]);

  const openDropdown = () => {
    if (disabled || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const estimatedHeight = 330;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
    const maxW = Math.max(rect.width, Math.min(350, window.innerWidth - rect.left - 16));

    setDropdownStyle(
      openUp
        ? { position: 'fixed', left: rect.left, bottom: window.innerHeight - rect.top + 4, width: rect.width, maxWidth: maxW, zIndex: 9999 }
        : { position: 'fixed', left: rect.left, top: rect.bottom + 4, width: rect.width, maxWidth: maxW, zIndex: 9999 }
    );
    setIsOpen(true);
  };

  React.useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (dropdownRef.current?.contains(e.target as Node) || triggerRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
    };
    const handleScroll = (e: Event) => {
      if (dropdownRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
    };
    const handleResize = () => setIsOpen(false);

    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const toggleOption = (optId: any) => {
    const normId = typeof optId === 'number' ? optId : String(optId);
    const isSelected = selectedIds.includes(normId);
    let newSelected: any[];
    if (isSelected) {
      newSelected = selectedIds.filter(x => x !== normId);
    } else {
      newSelected = [...selectedIds, optId];
    }
    const cleanSelected = newSelected.map(x => (isNaN(Number(x)) ? x : Number(x)));
    onChange?.(cleanSelected.length > 0 ? cleanSelected : null);
  };

  return (
    <div className="space-y-3 relative text-left">
      <label className="text-caption font-black uppercase tracking-[0.2em] text-oro/60 ml-1 flex items-center gap-2">
        {icon} {label}
      </label>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => isOpen ? setIsOpen(false) : openDropdown()}
        className="w-full h-[58px] bg-black/40 border border-oro/10 px-6 py-4 text-left text-oro font-black outline-none focus:border-oro/40 disabled:cursor-default flex justify-between items-center transition-all text-sm xl:text-base ninja-clip-sm"
      >
        <span className={`${selectedOptions.length === 0 ? 'text-oro/20' : 'text-oro'} w-full text-left truncate`}>
          {selectedOptions.length > 0 ? `${selectedOptions.length} seleccionados` : placeholder}
        </span>
        <ChevronDown size={16} className={`text-oro/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedOptions.map((o: any) => {
            const optId = o.value !== undefined ? o.value : o.id;
            return (
              <span key={String(optId)} className="inline-flex items-center gap-1.5 bg-oro/10 border border-oro/20 text-oro text-caption font-black uppercase tracking-wider px-2.5 py-1 rounded-xl">
                {o.label}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleOption(optId); }}
                  className="hover:text-red-400 transition-colors"
                >
                  <X size={10} strokeWidth={3} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="z-[9999] bg-black/95 border border-oro/20 shadow-[0_10px_30px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in duration-200 ninja-clip-sm backdrop-blur-md"
        >
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
          <div className="max-h-64 overflow-y-auto overflow-x-hidden custom-scrollbar">
            <button
              type="button"
              onClick={() => { onChange?.(null); setIsOpen(false); }}
              className="w-full text-left px-8 py-4 text-caption font-black text-oro/40 hover:bg-oro/5 uppercase tracking-widest border-b border-oro/5"
            >
              Ninguno / Quitar todos
            </button>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((o: any) => {
                const optId = o.value !== undefined ? o.value : o.id;
                const isSelected = selectedIds.includes(typeof optId === 'number' ? optId : String(optId));
                return (
                  <button
                    key={String(optId)}
                    type="button"
                    onClick={() => toggleOption(optId)}
                    className={`w-full flex items-center justify-between px-8 py-4 text-xs xl:text-sm font-black uppercase tracking-widest hover:bg-oro/10 hover:text-oro transition-all ${isSelected ? 'bg-oro/10 text-oro' : 'text-oro/40'}`}
                  >
                    <span>{o.label}</span>
                    {isSelected && <Check size={14} strokeWidth={3} className="text-oro" />}
                  </button>
                );
              })
            ) : (
              <div className="px-8 py-10 text-caption text-oro/20 font-black uppercase tracking-widest text-center italic">Sin resultados</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

