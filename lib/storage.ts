import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOADS_DIR = path.join(process.cwd(), "uploads", "media");

export async function ensureUploadsDirectory(): Promise<void> {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create uploads directory:", err);
  }
}

export async function saveMediaFile(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string
): Promise<{ storagePath: string; filename: string }> {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
  };
  const fileExt = mimeToExt[mimeType] || path.extname(originalFilename).toLowerCase() || ".bin";
  const randomId = crypto.randomBytes(16).toString("hex");
  const filename = `${Date.now()}-${randomId}${fileExt}`;
  const filePath = path.join(UPLOADS_DIR, filename);

  await fs.writeFile(filePath, buffer);
  return { storagePath: filePath, filename };
}

export async function readMediaFile(filePath: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

export async function deleteMediaFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // Ignore if already gone
  }
}
