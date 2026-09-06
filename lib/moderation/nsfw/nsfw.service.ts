import sharp, { type Metadata } from "sharp";
import { nsfwClassifier } from "./nsfw.classifier";
import {
  NSFW_CONFIG,
  CONTENT_GUIDELINE_ERROR,
  MODERATION_FAILED_ERROR,
} from "./nsfw.config";
import type {
  NsfwModerationInput,
  NsfwModerationResult,
} from "./nsfw.types";

// Magic Bytes / File Header Signatures
const SIGNATURES: { mime: string; bytes: number[] }[] = [
  // JPEG: FF D8 FF
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  // GIF: 47 49 46 38
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  // WEBP: RIFF .... WEBP
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
];

/**
 * Validates magic bytes against declared MIME type to reject spoofed files
 */
export function detectMagicBytes(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 12) return null;

  for (const sig of SIGNATURES) {
    let match = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (buffer[i] !== sig.bytes[i]) {
        match = false;
        break;
      }
    }
    if (match) {
      if (sig.mime === "image/webp") {
        if (
          buffer[8] === 0x57 &&
          buffer[9] === 0x45 &&
          buffer[10] === 0x42 &&
          buffer[11] === 0x50
        ) {
          return "image/webp";
        }
        continue;
      }
      return sig.mime;
    }
  }

  return null;
}

export class NsfwModerationService {
  /**
   * Complete server-side image moderation pipeline using Falconsai/nsfw_image_detection
   */
  public async moderateImage(input: NsfwModerationInput): Promise<NsfwModerationResult> {
    // 1. File Size Guard
    if (
      input.byteSize > NSFW_CONFIG.MAX_FILE_SIZE ||
      input.buffer.length > NSFW_CONFIG.MAX_FILE_SIZE
    ) {
      return {
        passed: false,
        status: "REJECTED",
        category: "INVALID_FILE",
        score: 1.0,
        nsfwScore: 1.0,
        normalScore: 0.0,
        reason: `File size exceeds allowable limit (${(NSFW_CONFIG.MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB).`,
      };
    }

    // 2. Binary Magic Bytes / Header Signature Verification
    const detectedMime = detectMagicBytes(input.buffer);
    if (!detectedMime) {
      return {
        passed: false,
        status: "REJECTED",
        category: "INVALID_FILE",
        score: 1.0,
        nsfwScore: 1.0,
        normalScore: 0.0,
        reason: "File signature invalid or unsupported image format.",
      };
    }

    // 3. Image decodability and metadata inspection via sharp
    let imageMetadata: Metadata;
    try {
      const sharpInstance = sharp(input.buffer, { failOn: "error" });
      imageMetadata = await sharpInstance.metadata();

      if (!imageMetadata.width || !imageMetadata.height) {
        return {
          passed: false,
          status: "REJECTED",
          category: "CORRUPT_MEDIA",
          score: 1.0,
          nsfwScore: 1.0,
          normalScore: 0.0,
          reason: "Image dimensions cannot be decoded.",
        };
      }

      if (
        imageMetadata.width > NSFW_CONFIG.MAX_DIMENSION ||
        imageMetadata.height > NSFW_CONFIG.MAX_DIMENSION
      ) {
        return {
          passed: false,
          status: "REJECTED",
          category: "INVALID_FILE",
          score: 1.0,
          nsfwScore: 1.0,
          normalScore: 0.0,
          reason: `Image dimensions exceed the maximum allowed ${NSFW_CONFIG.MAX_DIMENSION}px limit.`,
        };
      }
    } catch {
      return {
        passed: false,
        status: "REJECTED",
        category: "CORRUPT_MEDIA",
        score: 1.0,
        nsfwScore: 1.0,
        normalScore: 0.0,
        reason: "Image data is corrupt or failed decodability validation.",
      };
    }

    // 4. Hugging Face Model Inference (Falconsai/nsfw_image_detection)
    try {
      const { scores, durationMs } = await nsfwClassifier.classify(input.buffer);

      const nsfwEntry = scores.find((s) => s.label.toLowerCase() === "nsfw");
      const normalEntry = scores.find((s) => s.label.toLowerCase() === "normal");

      const nsfwScore = nsfwEntry ? nsfwEntry.score : 0.0;
      const normalScore = normalEntry ? normalEntry.score : 1.0 - nsfwScore;

      // Decision rule: nsfwScore >= THRESHOLD (0.80) => REJECTED
      if (nsfwScore >= NSFW_CONFIG.THRESHOLD) {
        return {
          passed: false,
          status: "REJECTED",
          category: "EXPLICIT_NUDITY",
          score: parseFloat(nsfwScore.toFixed(4)),
          nsfwScore: parseFloat(nsfwScore.toFixed(4)),
          normalScore: parseFloat(normalScore.toFixed(4)),
          reason: CONTENT_GUIDELINE_ERROR,
          metadata: {
            format: imageMetadata.format,
            width: imageMetadata.width,
            height: imageMetadata.height,
            detectedMimeType: detectedMime,
            modelName: NSFW_CONFIG.HUGGING_FACE_ID,
            inferenceDurationMs: durationMs,
          },
        };
      }

      return {
        passed: true,
        status: "APPROVED",
        category: "SAFE",
        score: parseFloat(nsfwScore.toFixed(4)),
        nsfwScore: parseFloat(nsfwScore.toFixed(4)),
        normalScore: parseFloat(normalScore.toFixed(4)),
        metadata: {
          format: imageMetadata.format,
          width: imageMetadata.width,
          height: imageMetadata.height,
          detectedMimeType: detectedMime,
          modelName: NSFW_CONFIG.HUGGING_FACE_ID,
          inferenceDurationMs: durationMs,
        },
      };
    } catch (err) {
      console.error("NSFW moderation error:", err);
      // FAIL-CLOSED policy: If model fails or times out, never treat image as safe
      return {
        passed: false,
        status: "MODERATION_FAILED",
        category: "SERVICE_ERROR",
        score: 1.0,
        nsfwScore: 1.0,
        normalScore: 0.0,
        reason: MODERATION_FAILED_ERROR,
      };
    }
  }
}

export const nsfwModerationService = new NsfwModerationService();
