export interface ImageDetectionResult {
  status: "success" | "manual_required";
  fileName: string;
  uid?: string;
  imageType?: "main" | "back" | "side" | "detail" | "lifestyle" | "hero";
  reason?: string;
}

export const VALID_IMAGE_TYPES = ["main", "back", "side", "detail", "lifestyle", "hero"] as const;

export function detectImageMetadata(fileName: string): ImageDetectionResult {
  // Regex for UID: Starts with 3 uppercase letters, hyphen, 4 digits
  // e.g., ZYN-0007
  const uidRegex = /^([A-Z]{3}-\d{4})/;
  const uidMatch = fileName.match(uidRegex);

  if (!uidMatch) {
    return {
      status: "manual_required",
      fileName,
      reason: "UID pattern mismatch (Expected format: XXX-0000...)",
    };
  }

  const uid = uidMatch[1];

  // Detect Type
  // Look for the type string in the filename, preceded by a hyphen or underscore
  // e.g. -main, -back, _side
  // Case insensitive match
  const lowerName = fileName.toLowerCase();
  let detectedType: ImageDetectionResult["imageType"] | undefined;

  for (const type of VALID_IMAGE_TYPES) {
    if (lowerName.includes(`-${type}`) || lowerName.includes(`_${type}`)) {
      detectedType = type;
      break;
    }
  }

  // Special case: if no explicit type found, check if it ends with just the UID (maybe main?) 
  // or simple numbering? 
  // The rules say: "If filename doesn't match: Return manual_required"
  // So strictly, we need to find one of the types.

  if (!detectedType) {
    return {
      status: "manual_required",
      fileName,
      uid, // We at least found the UID
      reason: "Image type not detected (e.g. -main, -back)",
    };
  }

  return {
    status: "success",
    fileName,
    uid,
    imageType: detectedType,
  };
}

