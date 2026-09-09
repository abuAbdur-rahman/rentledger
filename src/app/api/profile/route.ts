import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getUser } from "@/services/user";

export async function GET() {
  const userData = await getUser();
  if (!userData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServerClient();
  
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, phone_number, role, created_at")
    .eq("id", userData.id)
    .single();

  if (profileError) {
    console.error("Profile error:", profileError);
    return NextResponse.json({ profile: null });
  }

  if (!profile) {
    return NextResponse.json({ profile: null });
  }

  const profileWithEmail = {
    id: profile.id,
    email: userData.email,
    full_name: profile.full_name,
    phone_number: profile.phone_number,
    role: profile.role,
    created_at: profile.created_at,
  };

  return NextResponse.json({ profile: profileWithEmail });
}

export async function PATCH(req: NextRequest) {
  const userData = await getUser();
  if (!userData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServerClient();
  const body = await req.json();
  const { full_name, phone_number } = body;

  const updates: { full_name?: string; phone_number?: string | null } = {};
  if (full_name !== undefined) updates.full_name = full_name;
  if (phone_number !== undefined) updates.phone_number = phone_number || null;

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userData.id)
    .select("id, email, full_name, phone_number, role, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
