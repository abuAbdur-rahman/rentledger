import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/request";
import type { UserRole } from "@/types/database";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const { supabase, headers } = createServerClient(req);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.user || !data.session) {
      console.log(error);
      return NextResponse.json(
        { error: error?.message || "Invalid email or password" },
        { status: 401 },
      );
    }
    // const { access_token, refresh_token } = data.session;

    // await Promise.all([
    //   headers.append(
    //     "Set-Cookie",
    //     `sb-access-token=${access_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${data.session.expires_in}`,
    //   ),
    //   headers.append(
    //     "Set-Cookie",
    //     `sb-refresh-token=${refresh_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`,
    //   ),
    // ]);

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, role, phone_number")
      .eq("id", data.user.id)
      .single();

    const role =
      (profile?.role as UserRole) || data.user.user_metadata?.role || "tenant";
    const fullName =
      profile?.full_name || data.user.user_metadata?.full_name || "";

    // Store user in cookie for subsequent requests
    const cookieValue = encodeURIComponent(
      JSON.stringify({
        id: data.user.id,
        email: data.user.email,
        full_name: fullName,
        role,
      }),
    );
    headers.append(
      "Set-Cookie",
      `rl_user=${cookieValue}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${data.session.expires_in}`,
    );

    // Return session tokens so client can set Supabase cookies
    return NextResponse.json(
      {
        user: {
          id: data.user.id,
          email: data.user.email,
          full_name: fullName,
          role,
          phone: profile?.phone_number || data.user.user_metadata?.phone_number,
        },
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
      { headers },
    );
  } catch (error) {
    console.error("[auth/signin]", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
