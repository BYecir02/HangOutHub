const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.webm', '.mkv', '.ogv'];

export function isVideoUrl(value?: string | null) {
  if (!value) {
    return false;
  }

  try {
    const pathname = new URL(value).pathname.toLowerCase();
    return VIDEO_EXTENSIONS.some((extension) => pathname.endsWith(extension));
  } catch {
    const lower = value.toLowerCase();
    return VIDEO_EXTENSIONS.some((extension) => lower.includes(extension));
  }
}

export function isVideoMimeType(value?: string | null) {
  return typeof value === 'string' && value.startsWith('video/');
}
