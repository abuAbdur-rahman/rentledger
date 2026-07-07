import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.nextUrl);
  const code = searchParams.get("code");

  if (code) {
    return NextResponse.redirect(`${origin}/auth/login?status=confirmed`);
  }

  return NextResponse.redirect(`${origin}/auth/login`);
}
