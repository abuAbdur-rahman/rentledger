import { createServerClient as createSupabaseServerClient } from "@supabase/ssr"
import type { NextRequest } from "next/server"
import type { Database } from "@/types/database"

export function createServerClient(request: NextRequest) {
  const responseHeaders = new Headers()

  const supabase = createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieStr = `${name}=${value}; Path=${options?.path || "/"}; HttpOnly${options?.secure ? "; Secure" : ""}; SameSite=${options?.sameSite || "lax"}${options?.maxAge ? "; Max-Age=" + options.maxAge : ""}`
            responseHeaders.append("Set-Cookie", cookieStr)
          })
        },
      },
    }
  )

  return { supabase, headers: responseHeaders }
}
