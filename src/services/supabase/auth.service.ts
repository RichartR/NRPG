import { createClient } from '@/utils/supabase/client';

export const AuthService = {
  async signIn(email: string, password: string) {
    const supabase = createClient();
    return await supabase.auth.signInWithPassword({ email, password });
  },

  async signUp(email: string, password: string, username: string) {
    const supabase = createClient();
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.trim()
        }
      }
    });
  },

  async signInWithDiscord(redirectTo: string) {
    const supabase = createClient();
    return await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo
      }
    });
  },

  async signOut() {
    const supabase = createClient();
    return await supabase.auth.signOut();
  },

  async getSession() {
    const supabase = createClient();
    return await supabase.auth.getSession();
  },

  async getUser() {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { data: { user: null }, error: null };
    return await supabase.auth.getUser();
  }
};
