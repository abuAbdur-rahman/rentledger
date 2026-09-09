import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/request";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.nextUrl);
  const code = searchParams.get("code");

  if (code) {
    const { supabase, headers } = createServerClient(req);

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Auth callback error:", error);
      return NextResponse.redirect(`${origin}/auth/login?error=confirmation_failed`, {
        headers,
      });
    }

    return NextResponse.redirect(`${origin}/auth/login?status=confirmed`, {
      headers,
    });
  }

  return NextResponse.redirect(
    `${origin}/auth/login?error=confirmation_failed`,
  );
}
