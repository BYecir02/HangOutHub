import type * as ImagePicker from 'expo-image-picker';

export const MAX_MEDIA_FILE_SIZE_BYTES = 40 * 1024 * 1024;
export const MAX_MEDIA_FILE_SIZE_LABEL = '40 Mo';

export type MediaUploadAsset = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  duration?: number | null;
  fileSize?: number | null;
  type?: ImagePicker.ImagePickerAsset['type'] | null;
};

const IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'heic',
  'heif',
  'bmp',
  'tif',
  'tiff',
  'avif',
]);

const VIDEO_EXTENSIONS = new Set([
  'mp4',
  'mov',
  'm4v',
  'webm',
  'mkv',
  'ogv',
  'avi',
  '3gp',
]);

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
  'image/avif': 'avif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/x-m4v': 'm4v',
  'video/webm': 'webm',
  'video/x-matroska': 'mkv',
  'video/ogg': 'ogv',
  'video/x-msvideo': 'avi',
  'video/3gpp': '3gp',
  'video/3gpp2': '3gp',
};

const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  bmp: 'image/bmp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  avif: 'image/avif',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  ogv: 'video/ogg',
  avi: 'video/x-msvideo',
  '3gp': 'video/3gpp',
};

export function inferMediaKind(media: MediaUploadAsset) {
  if (media.type === 'video') {
    return 'video' as const;
  }

  if (media.type === 'image') {
    return 'image' as const;
  }

  if (typeof media.duration === 'number' && media.duration > 0) {
    return 'video' as const;
  }

  const mimeType = media.mimeType?.toLowerCase();
  if (mimeType?.startsWith('video/')) {
    return 'video' as const;
  }

  if (mimeType?.startsWith('image/')) {
    return 'image' as const;
  }

  const normalizedName = (media.fileName || media.uri).toLowerCase();
  if (new RegExp(`\\.(${Array.from(VIDEO_EXTENSIONS).join('|')})(\\?|#|$)`).test(normalizedName)) {
    return 'video' as const;
  }

  if (new RegExp(`\\.(${Array.from(IMAGE_EXTENSIONS).join('|')})(\\?|#|$)`).test(normalizedName)) {
    return 'image' as const;
  }

  return null;
}

export function inferMediaExtension(media: MediaUploadAsset) {
  const fileName = media.fileName?.trim();
  if (fileName?.includes('.')) {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension && (IMAGE_EXTENSIONS.has(extension) || VIDEO_EXTENSIONS.has(extension))) {
      return extension;
    }
  }

  const mimeType = media.mimeType?.toLowerCase();
  if (mimeType && EXTENSION_BY_MIME_TYPE[mimeType]) {
    return EXTENSION_BY_MIME_TYPE[mimeType];
  }

  return inferMediaKind(media) === 'video' ? 'mp4' : 'jpg';
}

export function inferMediaMimeType(media: MediaUploadAsset) {
  if (media.mimeType) {
    return media.mimeType;
  }

  const extension = inferMediaExtension(media);
  return MIME_TYPE_BY_EXTENSION[extension] || (inferMediaKind(media) === 'video' ? 'video/mp4' : 'image/jpeg');
}

export function getUploadFileName(media: MediaUploadAsset, index: number, prefix = 'media') {
  const fileName = media.fileName?.trim();
  if (fileName?.includes('.')) {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension && (IMAGE_EXTENSIONS.has(extension) || VIDEO_EXTENSIONS.has(extension))) {
      return fileName;
    }
  }

  return `${prefix}_${index}.${inferMediaExtension(media)}`;
}

export function buildMediaUploadPayload(media: MediaUploadAsset, index: number, prefix = 'media') {
  return {
    uri: media.uri,
    name: getUploadFileName(media, index, prefix),
    type: inferMediaMimeType(media),
  };
}

export function isMediaFileTooLarge(media: MediaUploadAsset) {
  return typeof media.fileSize === 'number' && media.fileSize > MAX_MEDIA_FILE_SIZE_BYTES;
}

export function isSupportedMediaAsset(media: MediaUploadAsset) {
  return inferMediaKind(media) !== null;
}
