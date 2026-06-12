import { createClient } from '@/utils/supabase/client';

export const IPService = {
  async isIPBlocked(ip: string, client?: any): Promise<boolean> {
    const supabase = client || createClient();
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('sys_blocked_ips')
        .select('ip')
        .eq('ip', ip)
        .or(`blocked_until.is.null,blocked_until.gt.${now}`)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking blocked IP status:', error);
      return false;
    }
  },

  async blockIP(ip: string, reason?: string, blockedUntil?: string | null, client?: any) {
    const supabase = client || createClient();
    const { error } = await supabase
      .from('sys_blocked_ips')
      .upsert({ 
        ip, 
        reason, 
        blocked_until: blockedUntil || null,
        created_at: new Date().toISOString() 
      });
    if (error) throw error;
  },

  async unblockIP(ip: string, client?: any) {
    const supabase = client || createClient();
    const { error } = await supabase
      .from('sys_blocked_ips')
      .delete()
      .eq('ip', ip);
    if (error) throw error;
  },

  async whitelistIP(ip: string, description?: string, client?: any) {
    const supabase = client || createClient();
    const { error } = await supabase
      .from('sys_whitelisted_ips')
      .upsert({ ip, description, created_at: new Date().toISOString() });
    if (error) throw error;
  },

  async removeWhitelistIP(ip: string, client?: any) {
    const supabase = client || createClient();
    const { error } = await supabase
      .from('sys_whitelisted_ips')
      .delete()
      .eq('ip', ip);
    if (error) throw error;
  }
};
