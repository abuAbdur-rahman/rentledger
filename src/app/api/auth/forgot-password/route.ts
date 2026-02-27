import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/request";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const { supabase } = createServerClient(req);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${req.nextUrl.origin}/auth/reset-password`,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[auth/forgot-password]", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
