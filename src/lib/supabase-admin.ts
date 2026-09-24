import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseServerKey } from './supabase-server-key'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  getSupabaseServerKey()!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
)
