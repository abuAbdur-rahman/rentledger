import { authService } from "@/services/auth";
import type { UserRole } from "@/types/database";

export interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
}

export interface SignInParams {
  email: string;
  password: string;
}

export interface AuthResult {
  data: { user: unknown } | null;
  error: Error | null;
}

export async function signUp({ email, password, fullName, role }: SignUpParams): Promise<AuthResult> {
  const result = await authService.signUp(email, password, fullName, undefined, role);

  if (result.error) {
    return { data: null, error: new Error(result.error) };
  }

  if (!result.data) {
    return { data: null, error: new Error("Failed to create account") };
  }

  return { data: { user: result.data }, error: null };
}

export async function signIn({ email, password }: SignInParams): Promise<AuthResult> {
  const result = await authService.signIn(email, password);

  if (result.error) {
    return { data: null, error: new Error(result.error) };
  }

  return { data: { user: result.data?.user ?? null }, error: null };
}

export async function signOut(): Promise<{ error: Error | null }> {
  const result = await authService.signOut();
  return { error: result.error ? new Error(result.error) : null };
}

export async function getCurrentUser() {
  const result = await authService.getCurrentUser();

  if (result.error || !result.data) {
    return {
      user: null,
      error: result.error ? new Error(result.error) : new Error("Not authenticated"),
    };
  }

  return { user: result.data, error: null };
}

export function onAuthStateChange(
  callback: (event: string, session: unknown) => void
) {
  // App now uses cookie-backed sessions, so this hook only emits a no-op unsubscribe.
  callback("INITIAL_SESSION", null);
  return {
    data: {
      subscription: {
        unsubscribe: () => undefined,
      },
    },
  };
}
