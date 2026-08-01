'use client';

import Link from 'next/link';

export interface CrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: CrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex flex-wrap items-center gap-3 text-xs xl:text-sm font-black uppercase tracking-[0.2em]">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div key={index} className="flex items-center gap-3">
            {index > 0 && (
              <div className="w-1.5 h-1.5 bg-[#D6852D] rotate-45 shadow-[0_0_8px_rgba(103,9,9,0.6)] shrink-0" />
            )}

            {isLast || !item.href ? (
              <span className="text-white font-bold brightness-110 drop-shadow-[0_0_10px_rgba(255,255,255,0.25)]">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="group/crumb transition-all hover:scale-105 active:scale-95 duration-300 inline-block"
              >
                <span className="text-neutral-300 group-hover/crumb:text-white font-bold transition-colors">
                  {item.label}
                </span>
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
