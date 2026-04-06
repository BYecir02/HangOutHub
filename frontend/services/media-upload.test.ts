import {
  MAX_MEDIA_FILE_SIZE_BYTES,
  buildMediaUploadPayload,
  inferMediaExtension,
  inferMediaKind,
  inferMediaMimeType,
  isMediaFileTooLarge,
  isSupportedMediaAsset,
} from './media-upload';

describe('media-upload helpers', () => {
  it('detects image and video kinds from metadata', () => {
    expect(inferMediaKind({ uri: 'file:///photo.jpg', type: 'image' })).toBe('image');
    expect(inferMediaKind({ uri: 'file:///clip.mov', duration: 10 })).toBe('video');
    expect(inferMediaKind({ uri: 'file:///unknown.bin' })).toBeNull();
  });

  it('derives extension and mime type consistently', () => {
    expect(inferMediaExtension({ uri: 'file:///photo', mimeType: 'image/png' })).toBe('png');
    expect(inferMediaExtension({ uri: 'file:///clip.mov', fileName: 'clip.mov' })).toBe('mov');
    expect(inferMediaMimeType({ uri: 'file:///clip', fileName: 'clip.webm' })).toBe('video/webm');
  });

  it('builds upload payloads with a fallback file name', () => {
    expect(buildMediaUploadPayload({ uri: 'file:///photo', mimeType: 'image/jpeg' }, 2, 'avatar')).toEqual({
      uri: 'file:///photo',
      name: 'avatar_2.jpg',
      type: 'image/jpeg',
    });
  });

  it('flags oversize files and supports the exact limit', () => {
    expect(isMediaFileTooLarge({ uri: 'file:///photo', fileSize: MAX_MEDIA_FILE_SIZE_BYTES })).toBe(false);
    expect(isMediaFileTooLarge({ uri: 'file:///photo', fileSize: MAX_MEDIA_FILE_SIZE_BYTES + 1 })).toBe(true);
    expect(isSupportedMediaAsset({ uri: 'file:///photo', mimeType: 'image/png' })).toBe(true);
    expect(isSupportedMediaAsset({ uri: 'file:///photo.bin' })).toBe(false);
  });
});
