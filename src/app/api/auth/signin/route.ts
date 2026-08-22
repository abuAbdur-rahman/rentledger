import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth/password";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
} from "@/lib/auth/session";
import { connectToMongoDB } from "@/lib/mongodb/connection";
import { ProfileModel } from "@/lib/mongodb/models";
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

    const normalizedEmail = String(email).trim().toLowerCase();

    await connectToMongoDB();

    const profile = await ProfileModel.findOne({ email: normalizedEmail })
      .select("_id email fullName role phoneNumber +passwordHash")
      .lean();

    if (!profile?.passwordHash) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const isPasswordValid = await verifyPassword(password, profile.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const role: UserRole = profile.role === "landlord" ? "landlord" : "tenant";
    const user = {
      id: String(profile._id),
      email: profile.email || normalizedEmail,
      full_name: profile.fullName || "",
      role,
      phone: profile.phoneNumber || null,
    };

    const sessionToken = createSessionToken({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role,
    });

    const response = NextResponse.json({ user });
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });

    return response;
  } catch (error) {
    console.error("[auth/signin]", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
