const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.webm', '.mkv', '.ogv'];
const VIDEO_MIME_HINTS = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/ogg',
  'video/x-matroska',
];

export function isVideoUrl(value?: string | null) {
  if (!value) {
    return false;
  }

  const normalizedValue = value.trim();
  if (normalizedValue.startsWith('data:video/')) {
    return true;
  }

  try {
    const parsed = new URL(normalizedValue);
    const pathname = parsed.pathname.toLowerCase();

    if (VIDEO_EXTENSIONS.some((extension) => pathname.endsWith(extension))) {
      return true;
    }

    const queryValues = Array.from(parsed.searchParams.values()).map((entry) =>
      entry.toLowerCase(),
    );

    if (queryValues.some((entry) => VIDEO_MIME_HINTS.some((hint) => entry.includes(hint)))) {
      return true;
    }

    return false;
  } catch {
    const lower = normalizedValue.toLowerCase();

    if (VIDEO_EXTENSIONS.some((extension) => lower.includes(extension))) {
      return true;
    }

    return VIDEO_MIME_HINTS.some((hint) => lower.includes(hint));
  }
}

export function isVideoMimeType(value?: string | null) {
  return typeof value === 'string' && value.startsWith('video/');
}
