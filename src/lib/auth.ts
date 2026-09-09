import { supabase } from "@/lib/supabase/client"
import type { UserRole } from "@/types/database"

export interface SignUpParams {
  email: string
  password: string
  fullName: string
  role: UserRole
}

export interface SignInParams {
  email: string
  password: string
}

export interface AuthResult {
  data: { user: unknown } | null
  error: Error | null
}

export async function signUp({ email, password, fullName, role }: SignUpParams): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role,
      },
    },
  })

  if (error) {
    return { data: null, error }
  }

  return { data: data as { user: unknown }, error: null }
}

export async function signIn({ email, password }: SignInParams): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { data: null, error }
  }

  return { data: { user: data.user }, error: null }
}

export async function signOut(): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { user: null, error }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (profileError) {
    return { user: null, error: profileError }
  }

  return { user: profile, error: null }
}

export function onAuthStateChange(
  callback: (event: string, session: unknown) => void
) {
  return supabase.auth.onAuthStateChange(callback)
}
