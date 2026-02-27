import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/request";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.nextUrl);
  const code = searchParams.get("code");

  if (code) {
    const { supabase, headers } = createServerClient(req);

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    console.log(code, error);

    if (!error) {
      return NextResponse.redirect(`${origin}/auth/login?status=confirmed`, {
        headers,
      });
    }
  }

  console.log(code ? "code is detected" : "no code detected");

  return NextResponse.redirect(
    `${origin}/auth/login?error=confirmation_failed`,
  );
}
