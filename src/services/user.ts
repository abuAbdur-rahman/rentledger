import { cookies } from "next/headers"
import type { UserRole } from "@/types/database"

export interface AuthUser {
  id: string
  email: string
  full_name: string
  role: UserRole
}

export const getUser = async (): Promise<AuthUser | null> => {
  const cookieStore = await cookies()
  const userCookie = cookieStore.get("rl_user")?.value

  if (!userCookie) {
    return null
  }

  try {
    const user = JSON.parse(userCookie) as AuthUser
    return user
  } catch {
    return null
  }
}
