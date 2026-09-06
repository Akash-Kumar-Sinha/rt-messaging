import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { mediaDb, verifyConversationMembership } from "@/lib/db";
import { readMediaFile } from "@/lib/storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: mediaId } = await params;
    const media = await mediaDb.where({ id: mediaId }).first();
    if (!media) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    // Security check 1: Media must be APPROVED (never expose rejected or pending media)
    if (media.status !== "APPROVED") {
      return NextResponse.json({ error: "Media is not available or was rejected" }, { status: 403 });
    }

    // Security check 2: User must be a member of the conversation
    const isMember = await verifyConversationMembership(media.conversationId, user.id);
    if (!isMember) {
      return NextResponse.json({ error: "You are not authorized to view this media" }, { status: 403 });
    }

    const fileBuffer = await readMediaFile(media.storagePath);
    if (!fileBuffer) {
      return NextResponse.json({ error: "Media file not found on disk" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": media.mimeType || "image/jpeg",
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "private, max-age=86400, immutable",
      },
    });
  } catch (err) {
    console.error("Fetch media error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
