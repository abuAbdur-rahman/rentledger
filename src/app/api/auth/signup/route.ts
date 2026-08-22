import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import { connectToMongoDB } from "@/lib/mongodb/connection";
import { ProfileModel } from "@/lib/mongodb/models";
import type { UserRole } from "@/types/database";

const ALLOWED_ROLES = new Set<UserRole>(["landlord", "tenant"]);

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName, phone, role } = await req.json();

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "Email, password, and full name are required" },
        { status: 400 },
      );
    }

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 },
      );
    }

    const nigerianPhoneRegex = /^(?:(?:\+234)|0)(?:70|80|81|82|83|90|91)\d{8}$/;
    if (!nigerianPhoneRegex.test(phone)) {
      return NextResponse.json(
        { error: "Please enter a valid Nigerian phone number" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPhone = String(phone).trim();
    const roleValue = ALLOWED_ROLES.has(role as UserRole)
      ? (role as UserRole)
      : "tenant";

    await connectToMongoDB();

    const existingProfile = await ProfileModel.findOne({
      $or: [
        { email: normalizedEmail },
        { phoneNumber: normalizedPhone },
      ],
    })
      .select("_id email phoneNumber")
      .lean();

    if (existingProfile?.email === normalizedEmail) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    if (existingProfile?.phoneNumber === normalizedPhone) {
      return NextResponse.json(
        { error: "This phone number is already registered" },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);

    const createdProfile = await ProfileModel.create({
      _id: randomUUID(),
      fullName: fullName.trim(),
      email: normalizedEmail,
      passwordHash,
      phoneNumber: normalizedPhone,
      role: roleValue,
    });

    return NextResponse.json({
      user: {
        id: String(createdProfile._id),
        email: normalizedEmail,
        full_name: createdProfile.fullName,
        role: createdProfile.role,
        phone: createdProfile.phoneNumber,
      },
    }, { status: 201 });
  } catch (error) {
    console.warn("[auth/signup]", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
