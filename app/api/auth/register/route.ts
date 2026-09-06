import { NextResponse } from "next/server";
import { z } from "zod";
import { usersDb } from "@/lib/db";
import {
  hashPassword,
  createAuthToken,
  generateDefaultAvatarUrl,
  TOKEN_COOKIE_NAME,
} from "@/lib/auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const RegisterSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().min(1).max(50),
  avatarUrl: z.string().url().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const rateLimit = await checkRateLimit(`auth:${ip}`, RATE_LIMITS.AUTH_ATTEMPT.limit, RATE_LIMITS.AUTH_ATTEMPT.windowSeconds);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const result = RegisterSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { username, email, password, displayName, avatarUrl } = result.data;

    // Check existing username or email
    const existingUsername = await usersDb.where({ username }).first();
    if (existingUsername) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 409 }
      );
    }

    const existingEmail = await usersDb.where({ email }).first();
    if (existingEmail) {
      return NextResponse.json(
        { error: "Email is already in use" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    const finalAvatarUrl =
      avatarUrl && avatarUrl.trim().length > 0
        ? avatarUrl.trim()
        : generateDefaultAvatarUrl(displayName || username);

    await usersDb.create({
      id: userId,
      username,
      email,
      passwordHash,
      displayName,
      avatarUrl: finalAvatarUrl,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const user = {
      id: userId,
      username,
      email,
      displayName,
      avatarUrl: finalAvatarUrl,
    };

    const token = await createAuthToken(user);

    const response = NextResponse.json({ success: true, user, token });
    response.cookies.set(TOKEN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
