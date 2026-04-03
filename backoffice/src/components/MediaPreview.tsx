type MediaPreviewProps = {
  src: string;
  alt?: string;
  className?: string;
  isVideo?: boolean;
  controls?: boolean;
  muted?: boolean;
  loop?: boolean;
};

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.webm', '.mkv', '.ogv'];

function looksLikeVideo(src: string) {
  try {
    const pathname = new URL(src).pathname.toLowerCase();
    return VIDEO_EXTENSIONS.some((extension) => pathname.endsWith(extension));
  } catch {
    const lower = src.toLowerCase();
    return VIDEO_EXTENSIONS.some((extension) => lower.includes(extension));
  }
}

export default function MediaPreview({
  src,
  alt = '',
  className = '',
  isVideo,
  controls = true,
  muted = true,
  loop = false,
}: MediaPreviewProps) {
  const video = typeof isVideo === 'boolean' ? isVideo : looksLikeVideo(src);

  if (video) {
    return (
      <video
        src={src}
        className={className}
        controls={controls}
        muted={muted}
        loop={loop}
        playsInline
      />
    );
  }

  return <img src={src} alt={alt} className={className} />;
}
