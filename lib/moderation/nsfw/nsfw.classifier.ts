import { pipeline, RawImage, env } from "@huggingface/transformers";
import { NSFW_CONFIG } from "./nsfw.config";
import type { NsfwClassificationScore } from "./nsfw.types";

// Configure local cache and execution settings
env.allowLocalModels = true;
env.allowRemoteModels = true;

export class NsfwClassifier {
  private static instance: NsfwClassifier | null = null;
  private pipelinePromise: Promise<any> | null = null;
  private activeInferences = 0;
  private waitQueue: Array<() => void> = [];

  public static getInstance(): NsfwClassifier {
    if (!NsfwClassifier.instance) {
      NsfwClassifier.instance = new NsfwClassifier();
    }
    return NsfwClassifier.instance;
  }

  /**
   * Initializes the pipeline once and caches the promise to prevent duplicate loading across concurrent requests
   */
  public getClassifier(): Promise<any> {
    if (!this.pipelinePromise) {
      this.pipelinePromise = (async () => {
        try {
          const classifier = await pipeline(
            "image-classification",
            NSFW_CONFIG.MODEL_NAME,
            { dtype: "q4" }
          );
          return classifier;
        } catch (err) {
          // Reset promise so subsequent calls can retry if desired, but throw for fail-closed
          this.pipelinePromise = null;
          throw new Error(
            `Failed to initialize NSFW model (${NSFW_CONFIG.MODEL_NAME}): ${(err as Error).message}`
          );
        }
      })();
    }
    return this.pipelinePromise;
  }

  /**
   * Concurrency-controlled inference runner with strict timeout
   */
  public async classify(
    buffer: Buffer
  ): Promise<{ scores: NsfwClassificationScore[]; durationMs: number }> {
    // 1. Acquire concurrency slot with while loop to avoid oversubscription
    while (this.activeInferences >= NSFW_CONFIG.MAX_CONCURRENT_INFERENCES) {
      await new Promise<void>((resolve) => this.waitQueue.push(resolve));
    }
    this.activeInferences++;

    const startTime = performance.now();

    try {
      const classifier = await this.getClassifier();

      // Convert buffer to RawImage
      const rawImage = await RawImage.fromBlob(new Blob([new Uint8Array(buffer)]));

      // Run inference with timeout
      let timeoutHandle: NodeJS.Timeout | null = null;
      let isTimedOut = false;

      const inferencePromise = (async () => {
        const result = (await classifier(rawImage)) as NsfwClassificationScore[];
        if (isTimedOut) {
          // Late completion after timeout - discard result and return empty
          return null;
        }
        return result;
      })();

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          isTimedOut = true;
          reject(
            new Error(`NSFW inference timed out after ${NSFW_CONFIG.TIMEOUT_MS}ms`)
          );
        }, NSFW_CONFIG.TIMEOUT_MS);
      });

      // Suppress unhandled rejections if inference rejects after timeout
      inferencePromise.catch(() => {});

      const output = await Promise.race([inferencePromise, timeoutPromise]);
      if (timeoutHandle) clearTimeout(timeoutHandle);

      if (!output || !Array.isArray(output) || output.length === 0) {
        throw new Error("Invalid output format returned from NSFW classifier");
      }

      const durationMs = parseFloat((performance.now() - startTime).toFixed(2));
      return { scores: output, durationMs };
    } finally {
      this.activeInferences--;
      if (this.waitQueue.length > 0) {
        const next = this.waitQueue.shift();
        if (next) next();
      }
    }
  }
}

export const nsfwClassifier = NsfwClassifier.getInstance();
