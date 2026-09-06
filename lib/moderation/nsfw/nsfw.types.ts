export type MediaModerationStatus =
  | "PENDING_MODERATION"
  | "APPROVED"
  | "REJECTED"
  | "MODERATION_FAILED";

export type NsfwCategory =
  | "SAFE"
  | "EXPLICIT_NUDITY"
  | "INVALID_FILE"
  | "CORRUPT_MEDIA"
  | "SERVICE_ERROR";

export interface NsfwClassificationScore {
  label: string; // "normal" | "nsfw"
  score: number;
}

export interface NsfwModerationInput {
  buffer: Buffer;
  filename: string;
  declaredMimeType: string;
  byteSize: number;
}

export interface NsfwModerationResult {
  passed: boolean;
  status: MediaModerationStatus;
  category: NsfwCategory;
  score: number; // The NSFW confidence score [0.0 - 1.0]
  nsfwScore: number;
  normalScore: number;
  reason?: string;
  metadata?: {
    format?: string;
    width?: number;
    height?: number;
    detectedMimeType?: string;
    modelName?: string;
    inferenceDurationMs?: number;
  };
}
