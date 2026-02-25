import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getUser } from "@/services/user";

export async function GET() {
  const userData = await getUser();
  if (!userData) {
    console.log("No user Data");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.log(
      "--------------------------------------------------/n/",
      data,
      "/n/--------------------------------------------------/n/",
      "userData:",
      userData,
    );
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
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
