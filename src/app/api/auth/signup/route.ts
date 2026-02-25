import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/request";

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName, phone, role } = await req.json();

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "Email, password, and full name are required" },
        { status: 400 },
      );
    }

    const { supabase } = createServerClient(req);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone_number: phone,
          role: role || "tenant",
        },
        emailRedirectTo: `${req.nextUrl.origin}/auth/callback`,
      },
    });

    if (error) {
      // console.log(`Failed to signUp User: ${error}`);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: fullName,
        role: role || "tenant",
      },
    });
  } catch (error) {
    console.warn("[auth/signup]", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
