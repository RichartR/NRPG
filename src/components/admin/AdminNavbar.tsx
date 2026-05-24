'use client';

import Link from 'next/link';
import { Settings, Map, ScrollText, ShoppingBag, GitBranch, Sword, FileText, ShieldCheck, ShieldAlert, LogOut, ChevronDown, LayoutDashboard } from 'lucide-react';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

interface MenuItem {
  href: string;
  label: string;
  icon: any;
}

export default function AdminNavbar() {
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const menuItems: MenuItem[] = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/sistemas', label: 'Sistemas', icon: Settings },
    { href: '/admin/aldeas', label: 'Aldeas', icon: Map },
    { href: '/admin/misiones', label: 'Misiones', icon: ScrollText },
    { href: '/registros/tiendas', label: 'Tiendas', icon: ShoppingBag },
    { href: '/admin/ramas', label: 'Ramas', icon: GitBranch },
    { href: '/admin/combate', label: 'Biblioteca', icon: Sword },
    { href: '/admin/documentos', label: 'Documentos', icon: FileText },
    { href: '/admin/fichas', label: 'Fichas', icon: ShieldCheck },
    { href: '/admin/disputas', label: 'Disputas', icon: ShieldAlert },
  ];

  const activeItem = menuItems.find(item =>
    item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
  ) || menuItems[0];

  return (
    <header className="w-full max-w-[1750px] mx-auto mb-10 ninja-card-oro p-6 sm:p-8 xl:p-10 z-50 relative">
      {/* Background glow decorator */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-oro/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />

      {/* Top row: Logo area + Return home */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pb-6 border-b border-oro/10 mb-6">
        <div className="flex items-center gap-4">
          <img src="/assets/icons/shuriken.png" className="w-5 sm:w-7 h-auto" alt="icon" />
          <div>
            <h1 className="ninja-title text-xl sm:text-3xl tracking-widest leading-none">
              PANEL ADMINISTRATIVO
            </h1>
            <p className="text-[8px] sm:text-[9px] font-black text-oro/30 uppercase tracking-[0.4em] mt-1.5 italic">
              SISTEMA DE GESTIÓN SHINOBI
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="flex items-center gap-3 px-6 py-3 bg-rojo-sangre/10 border border-rojo-sangre/20 hover:bg-rojo-sangre hover:text-oro text-rojo-sangre font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 italic"
          style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Regresar al Mundo</span>
        </Link>
      </div>

      {/* Mobile Selector Dropdown */}
      <div className="block lg:hidden relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full bg-black/60 border border-oro/20 px-6 py-4 text-oro font-black text-xs uppercase tracking-widest flex items-center justify-between transition-all"
          style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
        >
          <div className="flex items-center gap-3">
            <activeItem.icon className="w-4 h-4 text-oro" />
            <span>Módulo: {activeItem.label}</span>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform duration-350 ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {dropdownOpen && (
          <div className="absolute left-0 right-0 mt-2 bg-zinc-950 border border-oro/10 shadow-2xl z-50 p-2 space-y-1" style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}>
            {menuItems.map((item) => {
              const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDropdownOpen(false)}
                  className={`flex items-center gap-4 p-4 font-black text-xs uppercase tracking-wider transition-all rounded-sm ${isActive
                      ? 'bg-oro text-rojo-sangre'
                      : 'text-oro/60 hover:bg-oro/5 hover:text-oro'
                    }`}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop Horizontal Navigation (Scrollable if overflow) */}
      <nav className="hidden lg:flex flex-wrap items-center gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
        {menuItems.map((item) => {
          const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-5 py-3.5 font-black text-[10px] xl:text-xs uppercase tracking-widest transition-all relative shrink-0 ${isActive
                  ? 'bg-oro text-rojo-sangre shadow-md shadow-oro/5'
                  : 'bg-black/20 border border-oro/5 text-oro/40 hover:border-oro/20 hover:text-oro hover:bg-oro/5'
                }`}
              style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
