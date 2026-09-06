import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { imageModerationService } from "@/lib/moderation/image";
import { saveMediaFile } from "@/lib/storage";
import { mediaDb, moderationLogsDb, verifyConversationMembership } from "@/lib/db";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const user = await getSessionUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    const rateLimit = await checkRateLimit(
      `upload:${user.id}`,
      RATE_LIMITS.MEDIA_UPLOAD.limit,
      RATE_LIMITS.MEDIA_UPLOAD.windowSeconds
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Upload rate limit exceeded. Please wait before uploading more files." },
        { status: 429 }
      );
    }

    const maxAllowedSize = 10 * 1024 * 1024; // 10MB
    const maxStreamLimit = maxAllowedSize + 1024 * 1024; // 11MB headroom for multipart boundaries

    // Early Content-Length check to guard against oversized requests
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > maxStreamLimit) {
      return NextResponse.json(
        { error: "Payload exceeds 10MB limit", code: "PAYLOAD_TOO_LARGE" },
        { status: 413 }
      );
    }

    // Stream and count bytes with streaming guard to prevent DoS from chunked or spoofed requests
    if (!request.body) {
      return NextResponse.json({ error: "No payload received" }, { status: 400 });
    }

    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.length;
        if (totalBytes > maxStreamLimit) {
          await reader.cancel("Payload too large");
          return NextResponse.json(
            { error: "Payload exceeds 10MB limit", code: "PAYLOAD_TOO_LARGE" },
            { status: 413 }
          );
        }
        chunks.push(value);
      }
    }

    // Reconstruct Response from bounded chunks to parse formData safely
    const fullBodyBuffer = Buffer.concat(chunks);
    const contentType = request.headers.get("content-type") || "";
    const parsedResponse = new Response(fullBodyBuffer, {
      headers: { "content-type": contentType },
    });

    const formData = await parsedResponse.formData();
    const file = formData.get("file") as File | null;
    const conversationId = formData.get("conversationId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
    }

    // Size limit validation prior to full arrayBuffer materialization
    if (file.size > maxAllowedSize) {
      return NextResponse.json(
        { error: "File exceeds 10MB size limit", code: "PAYLOAD_TOO_LARGE" },
        { status: 413 }
      );
    }

    // Authorization
    const isMember = await verifyConversationMembership(conversationId, user.id);
    if (!isMember) {
      return NextResponse.json({ error: "You are not a member of this conversation" }, { status: 403 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Run Server-Side Image Moderation & Validation (Magic bytes, decodability, explicit content)
    const moderation = await imageModerationService.moderate({
      buffer,
      filename: file.name,
      declaredMimeType: file.type,
      byteSize: file.size,
    });

    const mediaId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Log moderation result
    await moderationLogsDb.create({
      id: crypto.randomUUID(),
      targetType: "MEDIA",
      targetId: mediaId,
      userId: user.id,
      flagType: moderation.category,
      score: moderation.score,
      reason: moderation.reason || "Image passed all moderation checks",
      passed: moderation.passed,
      createdAt: now,
    });

    if (!moderation.passed) {
      const code =
        moderation.status === "MODERATION_FAILED"
          ? "MODERATION_FAILED"
          : "IMAGE_REJECTED";
      const message =
        moderation.reason ||
        (code === "MODERATION_FAILED"
          ? "The image could not be processed. Please try again."
          : "This image cannot be sent.");

      return NextResponse.json(
        {
          code,
          message,
          error: message,
          status: moderation.status,
          category: moderation.category,
          score: moderation.score,
        },
        { status: 422 }
      );
    }

    // Save media securely
    const { storagePath } = await saveMediaFile(
      buffer,
      file.name,
      moderation.metadata?.detectedMimeType || file.type
    );

    await mediaDb.create({
      id: mediaId,
      uploaderId: user.id,
      conversationId,
      originalFilename: file.name,
      mimeType: moderation.metadata?.detectedMimeType || file.type,
      byteSize: file.size,
      width: moderation.metadata?.width || null,
      height: moderation.metadata?.height || null,
      storagePath,
      status: "APPROVED",
      moderationDetails: {
        score: moderation.score,
        category: moderation.category,
      },
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      media: {
        id: mediaId,
        url: `/api/media/${mediaId}`,
        originalFilename: file.name,
        mimeType: moderation.metadata?.detectedMimeType || file.type,
        width: moderation.metadata?.width,
        height: moderation.metadata?.height,
        byteSize: file.size,
        status: "APPROVED",
      },
    });
  } catch (err) {
    console.error("Media upload error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
