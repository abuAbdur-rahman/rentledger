import { createHmac, timingSafeEqual } from "crypto";
import type { UserRole } from "@/types/database";

export interface SessionUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}

interface SessionPayload {
  user: SessionUser;
  iat: number;
  exp: number;
}

export const SESSION_COOKIE_NAME = "rl_user";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function getSessionSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

  if (secret && secret.trim().length >= 16) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set in production.");
  }

  return "rentledger-dev-secret-change-me";
}

function sign(encodedPayload: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function isSignatureValid(encodedPayload: string, signature: string): boolean {
  const expected = sign(encodedPayload);
  const receivedBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function createSessionToken(
  user: SessionUser,
  ttlSeconds = SESSION_TTL_SECONDS,
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    user,
    iat: now,
    exp: now + ttlSeconds,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const signature = sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string | null | undefined): SessionUser | null {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature || !isSignatureValid(encodedPayload, signature)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as SessionPayload;

    if (!parsed?.user || typeof parsed.exp !== "number") {
      return null;
    }

    if (parsed.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    if (
      !parsed.user.id ||
      !parsed.user.email ||
      !parsed.user.full_name ||
      (parsed.user.role !== "landlord" && parsed.user.role !== "tenant")
    ) {
      return null;
    }

    return parsed.user;
  } catch {
    return null;
  }
}
