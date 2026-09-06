import { nsfwModerationService, detectMagicBytes } from "./nsfw/nsfw.service";
import {
  CONTENT_GUIDELINE_ERROR,
  MODERATION_FAILED_ERROR,
  NSFW_CONFIG,
} from "./nsfw/nsfw.config";
import type {
  MediaModerationStatus,
  NsfwCategory,
  NsfwModerationInput,
  NsfwModerationResult,
} from "./nsfw/nsfw.types";

export {
  nsfwModerationService,
  detectMagicBytes,
  CONTENT_GUIDELINE_ERROR,
  MODERATION_FAILED_ERROR,
  NSFW_CONFIG,
};

export type {
  MediaModerationStatus,
  NsfwCategory,
  NsfwModerationInput as ModerationInput,
  NsfwModerationResult as ModerationResult,
};

export interface ImageModerationService {
  moderate(input: NsfwModerationInput): Promise<NsfwModerationResult>;
}

export class HuggingFaceImageModerationService implements ImageModerationService {
  async moderate(input: NsfwModerationInput): Promise<NsfwModerationResult> {
    return nsfwModerationService.moderateImage(input);
  }
}

export const imageModerationService = new HuggingFaceImageModerationService();


