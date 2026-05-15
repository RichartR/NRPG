'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export default function AdminNotificationBadge() {
  const [count, setCount] = useState(0);

  const fetchCount = async () => {
    const supabase = createClient();
    const { count, error } = await supabase
      .from('sys_notificaciones_admin')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'pendiente');
    
    if (!error) {
      setCount(count || 0);
    }
  };

  useEffect(() => {
    fetchCount();

    const supabase = createClient();
    const channel = supabase
      .channel('sys_notificaciones_admin_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sys_notificaciones_admin'
        },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Link 
      href="/admin" 
      className="relative flex items-center gap-3 px-6 py-2.5 bg-rojo-sangre/20 text-oro border border-oro/20 hover:bg-rojo-sangre hover:border-oro/40 transition-all group font-black text-[10px] uppercase tracking-widest"
      style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
    >
      <div className="w-1.5 h-1.5 bg-oro rotate-45 group-hover:scale-125 transition-transform" />
      ADMIN PANEL
      {count > 0 && (
        <span className="absolute -top-2 -right-2 w-5 h-5 bg-rojo-sangre text-oro text-[10px] font-black flex items-center justify-center border border-oro/40 animate-bounce">
          {count}
        </span>
      )}
    </Link>
  );
}


