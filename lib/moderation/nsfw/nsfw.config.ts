export const NSFW_CONFIG = {
  // Hugging Face model identifier / local ONNX community repo
  MODEL_NAME: process.env.NSFW_MODEL || "onnx-community/nsfw_image_detection-ONNX",
  // Upstream Hugging Face model ID for documentation and auditing
  HUGGING_FACE_ID: "Falconsai/nsfw_image_detection",
  // Configurable NSFW decision threshold (nsfwScore >= threshold => REJECTED)
  THRESHOLD: parseFloat(process.env.NSFW_THRESHOLD || "0.80"),
  // Inference timeout in milliseconds
  TIMEOUT_MS: parseInt(process.env.NSFW_MODERATION_TIMEOUT_MS || "10000", 10),
  // Maximum concurrent inference executions
  MAX_CONCURRENT_INFERENCES: 4,
  // File size limit (10MB)
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  // Maximum pixel resolution
  MAX_DIMENSION: 6000,
};

export const CONTENT_GUIDELINE_ERROR = "This image cannot be sent.";
export const MODERATION_FAILED_ERROR = "The image could not be processed. Please try again.";
