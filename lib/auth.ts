import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import crypto from "crypto";

const rawSecret = process.env.JWT_SECRET;
if (!rawSecret && process.env.NODE_ENV === "production") {
  throw new Error("FATAL: JWT_SECRET environment variable must be set in production.");
}
const JWT_SECRET = new TextEncoder().encode(
  rawSecret || "dev-only-ephemeral-jwt-secret-key-32-chars-long-min!"
);
const TOKEN_COOKIE_NAME = "rt_auth_token";

export interface SessionUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
}

/**
 * Generates a default UI Avatars URL using the user's name.
 * Format: https://ui-avatars.com/api/?name={encodedName}
 */
export function generateDefaultAvatarUrl(name: string): string {
  const cleanName = name?.trim() || "User";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}`;
}

// Secure PBKDF2 Password Hashing
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100000, 64, "sha512", (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, key] = (hash || "").split(":");
  if (!salt || !key) return false;
  return new Promise((resolve) => {
    crypto.pbkdf2(password, salt, 100000, 64, "sha512", (err, derivedKey) => {
      if (err) {
        resolve(false);
        return;
      }
      try {
        const keyBuffer = Buffer.from(key, "hex");
        if (keyBuffer.length !== derivedKey.length) {
          resolve(false);
          return;
        }
        resolve(crypto.timingSafeEqual(keyBuffer, derivedKey));
      } catch {
        resolve(false);
      }
    });
  });
}

// JWT Token Creation and Verification
export async function createAuthToken(user: SessionUser): Promise<string> {
  return await new SignJWT({
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyAuthToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id || typeof payload.id !== "string") {
      return null;
    }
    return {
      id: payload.id as string,
      username: (payload.username as string) || "",
      email: (payload.email as string) || "",
      displayName: (payload.displayName as string) || "",
      avatarUrl: (payload.avatarUrl as string) || null,
    };
  } catch {
    return null;
  }
}

// Next.js Route Handler / Server Action Helper
export async function getSessionUserFromCookie(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifyAuthToken(token);
  } catch {
    return null;
  }
}

// Next.js Request Helper (for API routes)
export async function getSessionUserFromRequest(request: Request): Promise<SessionUser | null> {
  // Check Authorization header first
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    const user = await verifyAuthToken(token);
    if (user) return user;
  }

  // Fallback to Cookie header
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${TOKEN_COOKIE_NAME}=([^;]*)`));
  if (match && match[1]) {
    const token = decodeURIComponent(match[1]);
    return await verifyAuthToken(token);
  }

  return null;
}

export { TOKEN_COOKIE_NAME };
