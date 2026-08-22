import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCallback);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [salt, expectedHash] = storedHash.split(":");
  if (!salt || !expectedHash) {
    return false;
  }

  const expected = Buffer.from(expectedHash, "hex");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
