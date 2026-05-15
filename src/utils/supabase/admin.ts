import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client with the SERVICE_ROLE_KEY.
 * This client BYPASSES Row Level Security (RLS).
 * Use ONLY in server-side contexts (API Routes, Server Actions) 
 * and only for operations that MUST skip permission checks.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing in environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
