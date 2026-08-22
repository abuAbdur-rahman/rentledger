import { NextRequest, NextResponse } from "next/server";
import { hashPassword, sha256Hex } from "@/lib/auth/password";
import { connectToMongoDB } from "@/lib/mongodb/connection";
import { ProfileModel } from "@/lib/mongodb/models";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 },
      );
    }

    if (String(password).length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    await connectToMongoDB();

    const tokenHash = sha256Hex(String(token));

    const profile = await ProfileModel.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    })
      .select("_id")
      .lean();

    if (!profile) {
      return NextResponse.json(
        { error: "Invalid or expired reset link" },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(String(password));

    await ProfileModel.updateOne(
      { _id: profile._id },
      {
        $set: { passwordHash },
        $unset: {
          passwordResetTokenHash: "",
          passwordResetExpiresAt: "",
        },
      },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[auth/reset-password]", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
