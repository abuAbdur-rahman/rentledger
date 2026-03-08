import { NextRequest, NextResponse } from "next/server";
import { getDataProvider } from "@/lib/data/provider";
import { connectToMongoDB } from "@/lib/mongodb/connection";
import { ProfileModel } from "@/lib/mongodb/models";
import { createServerClient } from "@/lib/supabase/server";
import { getUser } from "@/services/user";

function normalizePhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("234") && digits.length === 13) {
    return `0${digits.slice(3)}`;
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return digits;
  }

  return value.trim();
}

function buildPhoneCandidates(value: string): string[] {
  const trimmed = value.trim();
  const normalized = normalizePhoneNumber(trimmed);
  const candidates = new Set<string>([trimmed, normalized]);

  if (normalized.length === 11 && normalized.startsWith("0")) {
    candidates.add(`+234${normalized.slice(1)}`);
  }

  return Array.from(candidates).filter(Boolean);
}

export async function GET(req: NextRequest) {
  const provider = getDataProvider();
  const phone = req.nextUrl.searchParams.get("phone");

  if (!phone?.trim()) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  if (provider === "mongo") {
    const userData = await getUser();
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToMongoDB();

    const phoneCandidates = buildPhoneCandidates(phone);

    const profile = await ProfileModel.findOne({
      role: "tenant",
      phoneNumber: { $in: phoneCandidates },
    })
      .select("_id")
      .lean();

    const legacyProfile = !profile
      ? await ProfileModel.collection.findOne(
          {
            role: "tenant",
            phone_number: { $in: phoneCandidates },
          },
          {
            projection: { _id: 1 },
          },
        )
      : null;

    return NextResponse.json({ valid: !!profile || !!legacyProfile }, { status: 200 });
  }

  const supabase = await createServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const normalizedPhone = normalizePhoneNumber(phone);

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone_number", normalizedPhone)
    .eq("role", "tenant")
    .single();

  if (!profile) {
    return NextResponse.json({ valid: false }, { status: 200 });
  }

  return NextResponse.json({ valid: true }, { status: 200 });
}
