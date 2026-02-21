import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

type PublicClient = SupabaseClient<Database>

export function createSupabaseClient(): PublicClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables")
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
}

export const supabase = createSupabaseClient()
