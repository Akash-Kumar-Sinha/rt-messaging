import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { processSendMessagePipeline } from "@/lib/message-pipeline";

export async function POST(request: Request) {
  try {
    const user = await getSessionUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = await processSendMessagePipeline(user.id, body);

    if (!result.success) {
      if (result.error?.code === "RATE_LIMITED") {
        const retryAfter = result.error.details?.retryAfter || 1;
        return NextResponse.json(
          {
            code: "MESSAGE_RATE_LIMITED",
            message: result.error.message || "You are sending messages too quickly. Please try again shortly.",
            retryAfter,
            details: result.error.details,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(retryAfter),
            },
          }
        );
      }

      const status =
        result.error?.code === "UNAUTHORIZED"
          ? 401
          : result.error?.code === "FORBIDDEN"
          ? 403
          : result.error?.code === "MODERATION_REJECTED"
          ? 422
          : 400;

      return NextResponse.json(
        {
          error: result.error?.message,
          code: result.error?.code,
          details: result.error?.details,
        },
        { status }
      );
    }

    return NextResponse.json({ message: result.message }, { status: 201 });
  } catch (err) {
    console.error("REST Send message error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
