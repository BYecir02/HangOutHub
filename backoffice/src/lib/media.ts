export const MAX_MEDIA_FILE_SIZE_BYTES = 40 * 1024 * 1024;
export const MAX_MEDIA_FILE_SIZE_MB = 40;

export function getMediaUploadErrorMessage(files: File[]) {
  const oversized = files.find((file) => file.size > MAX_MEDIA_FILE_SIZE_BYTES);

  if (!oversized) {
    return null;
  }

  return `Le fichier "${oversized.name}" est trop volumineux. Limite: ${MAX_MEDIA_FILE_SIZE_MB} Mo par fichier.`;
}
