import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  type SessionUser,
  verifySessionToken,
} from "@/lib/auth/session";

export type AuthUser = SessionUser;

export const getUser = async (): Promise<AuthUser | null> => {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  return verifySessionToken(sessionToken);
};
