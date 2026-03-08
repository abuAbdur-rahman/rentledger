import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { sha256Hex } from "@/lib/auth/password";
import { connectToMongoDB } from "@/lib/mongodb/connection";
import { ProfileModel } from "@/lib/mongodb/models";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    await connectToMongoDB();

    const profile = await ProfileModel.findOne({ email: normalizedEmail })
      .select("_id")
      .lean();

    // Do not disclose whether email exists.
    if (profile) {
      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = sha256Hex(rawToken);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      await ProfileModel.updateOne(
        { _id: profile._id },
        {
          $set: {
            passwordResetTokenHash: tokenHash,
            passwordResetExpiresAt: expiresAt,
          },
        },
      );

      if (process.env.NODE_ENV !== "production") {
        return NextResponse.json({
          success: true,
          resetUrl: `${req.nextUrl.origin}/auth/reset-password?token=${rawToken}`,
        });
      }
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
