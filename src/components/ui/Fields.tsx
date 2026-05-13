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
