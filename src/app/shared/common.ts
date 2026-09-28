export const isAbsoluteMediaUrl = (url: string): boolean => {
  if (!url || typeof url !== "string") {
    return false;
  }
  const trimmed = url.trim();
  return (
    /^https?:\/\//i.test(trimmed) ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("assets/")
  );
};

/**
 * Resolve a stored media path for display.
 * Absolute http(s)/data/blob/assets URLs are returned as-is.
 * Relative filenames are prefixed with basePath + optional folder (e.g. upload-files).
 */
export const resolveMediaUrl = (
  image: string | string[] | null | undefined,
  options?: {
    basePath?: string;
    folder?: string;
    fallback?: string;
  },
): string => {
  const fallback = options?.fallback ?? "assets/images/no-image-icon.png";
  if (image == null || image === "") {
    return fallback;
  }

  const raw = Array.isArray(image) ? image[0] : image;
  if (raw == null || raw === "") {
    return fallback;
  }

  let value = String(raw).trim();
  if (value.includes("|||")) {
    value = value.split("|||")[0].trim();
  } else if (value.includes(",")) {
    value = value.split(",")[0].trim();
  }

  if (!value || value === "undefined" || value === "null") {
    return fallback;
  }

  if (isAbsoluteMediaUrl(value)) {
    return value;
  }

  const basePath = options?.basePath ?? "";
  const folder = options?.folder
    ? `${options.folder.replace(/^\/+|\/+$/g, "")}/`
    : "";
  const relative = value.replace(/^\/+/, "");

  return `${basePath}${folder}${relative}`;
};

export const getFileType = (
  url: string | string[] | null | undefined,
): "image" | "video" | "unknown" => {
  const resolved =
    typeof url === "string" ? url : Array.isArray(url) ? url[0] : "";

  if (!resolved) {
    return "unknown";
  }

  // Check for base64 data format
  if (resolved.startsWith("data:image/")) {
    return "image";
  } else if (resolved.startsWith("data:video/")) {
    return "video";
  }

  // Absolute remote images (Cloudinary etc.) — treat as image when URL looks like one
  if (isAbsoluteMediaUrl(resolved)) {
    const lower = resolved.toLowerCase();
    if (
      lower.includes(".mp4") ||
      lower.includes(".mov") ||
      lower.includes(".webm") ||
      lower.includes("video/")
    ) {
      return "video";
    }
    return "image";
  }

  // Extract file extension (before query params or fragments)
  const extensionMatch = resolved
    .split("/")
    .pop()
    ?.split(".")
    .pop()
    ?.split("?")[0]
    ?.split("#")[0];
  if (!extensionMatch) {
    return "unknown";
  }

  const extension = extensionMatch.toLowerCase();

  const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "svg"];
  const videoExtensions = ["mp4", "mov", "avi", "wmv", "flv", "mkv", "webm"];

  if (imageExtensions.includes(extension)) {
    return "image";
  } else if (videoExtensions.includes(extension)) {
    return "video";
  } else {
    return "unknown";
  }
};
