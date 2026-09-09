import { createClient as createSupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const sessionStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === "undefined") return null
    return window.sessionStorage.getItem(key)
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === "undefined") return
    window.sessionStorage.setItem(key, value)
  },
  removeItem: (key: string): void => {
    if (typeof window === "undefined") return
    window.sessionStorage.removeItem(key)
  },
}

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

export function createClient() {
  return supabase
}
