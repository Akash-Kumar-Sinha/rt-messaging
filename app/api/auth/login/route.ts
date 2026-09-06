import { NextResponse } from "next/server";
import { z } from "zod";
import { usersDb } from "@/lib/db";
import { verifyPassword, createAuthToken, TOKEN_COOKIE_NAME } from "@/lib/auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const LoginSchema = z.object({
  login: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const rateLimit = await checkRateLimit(`auth:${ip}`, RATE_LIMITS.AUTH_ATTEMPT.limit, RATE_LIMITS.AUTH_ATTEMPT.windowSeconds);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const result = LoginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid credentials format" },
        { status: 400 }
      );
    }

    const { login, password } = result.data;

    // Find user by username or email
    const userRecord =
      (await usersDb.where({ username: login }).first()) ||
      (await usersDb.where({ email: login }).first());

    if (!userRecord) {
      return NextResponse.json(
        { error: "Invalid username/email or password" },
        { status: 401 }
      );
    }

    const passwordValid = await verifyPassword(password, userRecord.passwordHash);
    if (!passwordValid) {
      return NextResponse.json(
        { error: "Invalid username/email or password" },
        { status: 401 }
      );
    }

    const user = {
      id: userRecord.id,
      username: userRecord.username,
      email: userRecord.email,
      displayName: userRecord.displayName,
      avatarUrl: userRecord.avatarUrl,
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
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
