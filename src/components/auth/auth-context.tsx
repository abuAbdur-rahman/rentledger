"use client"

import { createContext, useContext } from "react"

export interface SessionUser {
  id: string
  name: string
  email: string
  role: "landlord" | "tenant"
  avatarUrl?: string
}

interface UserContextValue {
  user: SessionUser
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({
  user,
  children,
}: {
  user: SessionUser
  children: React.ReactNode
}) {
  return (
    <UserContext.Provider value={{ user }}>{children}</UserContext.Provider>
  )
}

export function useSessionUser(): SessionUser {
  const ctx = useContext(UserContext)
  if (!ctx) {
    throw new Error("useSessionUser must be used within a UserProvider")
  }
  return ctx.user
}

export function useIsLandlord() {
  return useSessionUser().role === "landlord"
}

export function useIsTenant() {
  return useSessionUser().role === "tenant"
}
