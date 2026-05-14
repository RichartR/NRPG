'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ShieldAlert } from 'lucide-react';
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
      className="relative flex items-center gap-2 px-4 py-2 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded-xl text-xs font-black hover:bg-orange-500 hover:text-white transition-all group"
    >
      <ShieldAlert className="w-4 h-4" />
      ADMIN PANEL
      {count > 0 && (
        <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-zinc-950 animate-bounce shadow-lg shadow-red-900/40">
          {count}
        </span>
      )}
    </Link>
  );
}
