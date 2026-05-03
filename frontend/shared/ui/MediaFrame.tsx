import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image as RNImage, Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useEventListener } from 'expo';
import { Image as ExpoImage } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';

import { isVideoUrl } from '@/services/shared/media';

interface MediaFrameProps {
  source: string;
  mediaType?: 'auto' | 'image' | 'video';
  className?: string;
  style?: StyleProp<ViewStyle>;
  shouldPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  showControls?: boolean;
  contentFit?: 'cover' | 'contain';
  fallbackLabel?: string;
  adaptiveHeight?: boolean;
  minHeight?: number;
  maxHeight?: number;
  fallbackAspectRatio?: number;
}

export default function MediaFrame({
  source,
  mediaType = 'auto',
  className,
  style,
  shouldPlay = false,
  muted = true,
  loop = true,
  showControls = false,
  contentFit = 'cover',
  fallbackLabel,
  adaptiveHeight = false,
  minHeight = 180,
  maxHeight = 520,
  fallbackAspectRatio = 4 / 5,
}: MediaFrameProps) {
  const isVideo = mediaType === 'video' ? true : mediaType === 'image' ? false : isVideoUrl(source);
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const [measuredAspectRatio, setMeasuredAspectRatio] = useState<number | null>(
    null,
  );
  const [posterSource, setPosterSource] = useState<unknown | null>(null);
  const [hasRenderedFirstFrame, setHasRenderedFirstFrame] = useState(false);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const isMountedRef = useRef(true);
  const thumbnailRequestIdRef = useRef(0);
  const videoSource = useMemo(() => {
    if (!isVideo) {
      return null;
    }

    return {
      uri: source,
      useCaching: true,
      contentType: 'auto' as const,
    };
  }, [isVideo, source]);

  const setupPlayer = useCallback((videoPlayer: ReturnType<typeof useVideoPlayer>) => {
    videoPlayer.bufferOptions = {
      preferredForwardBufferDuration: 1.5,
      waitsToMinimizeStalling: false,
      minBufferForPlayback: 0.5,
      maxBufferBytes: 0,
      prioritizeTimeOverSizeThreshold: true,
    };
  }, []);

  const player = useVideoPlayer(videoSource, setupPlayer);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setPosterSource(null);
    setHasRenderedFirstFrame(false);
    setImageLoadFailed(false);
  }, [source, isVideo]);

  useEventListener(player, 'sourceLoad', () => {
    if (!isVideo || !source) {
      return;
    }

    const requestId = thumbnailRequestIdRef.current + 1;
    thumbnailRequestIdRef.current = requestId;

    void (async () => {
      try {
        const thumbnails = await player.generateThumbnailsAsync([0.2], {
          maxWidth: 960,
          maxHeight: 960,
        });
        if (!isMountedRef.current || thumbnailRequestIdRef.current !== requestId) {
          return;
        }

        setPosterSource(thumbnails[0] || null);
      } catch {
        if (isMountedRef.current && thumbnailRequestIdRef.current === requestId) {
          setPosterSource(null);
        }
      }
    })();
  });

  useEventListener(player, 'statusChange', ({ status }) => {
    if (!isVideo || !shouldPlay || status !== 'readyToPlay') {
      return;
    }

    void player.play();
  });

  useEffect(() => {
    if (!adaptiveHeight || isVideo || !source) {
      return;
    }

    let isMounted = true;

    RNImage.getSize(
      source,
      (width, height) => {
        if (!isMounted || !width || !height) {
          return;
        }

        setMeasuredAspectRatio(width / height);
      },
      () => {
        if (isMounted) {
          setMeasuredAspectRatio(null);
        }
      },
    );

    return () => {
      isMounted = false;
    };
  }, [adaptiveHeight, isVideo, source]);

  useEffect(() => {
    if (!isVideo) {
      return;
    }

    player.loop = loop;
    player.muted = muted;

    if (shouldPlay) {
      void player.play();
      return;
    }

    player.pause();
  }, [isVideo, loop, muted, player, shouldPlay]);

  useEventListener(player, 'sourceLoad', ({ availableVideoTracks }) => {
    if (!adaptiveHeight || !isVideo) {
      return;
    }

    const primaryTrack = availableVideoTracks.find(
      (track) => track.size?.width && track.size?.height,
    );

    if (primaryTrack?.size?.width && primaryTrack?.size?.height) {
      setMeasuredAspectRatio(primaryTrack.size.width / primaryTrack.size.height);
    }
  });

  const resolvedAspectRatio = useMemo(() => {
    return measuredAspectRatio || fallbackAspectRatio;
  }, [fallbackAspectRatio, measuredAspectRatio]);

  const adaptiveStyle = adaptiveHeight
    ? {
        minHeight,
        height:
          measuredWidth > 0
            ? Math.max(
                minHeight,
                Math.min(maxHeight, measuredWidth / resolvedAspectRatio),
              )
            : minHeight,
      }
    : null;

  return (
    <View
      className={`overflow-hidden ${className ?? ''}`.trim()}
      style={[style, adaptiveStyle]}
      onLayout={
        adaptiveHeight
          ? (event) => {
              setMeasuredWidth(event.nativeEvent.layout.width);
            }
          : undefined
      }
    >
      {isVideo && posterSource && !hasRenderedFirstFrame ? (
        <ExpoImage
          source={posterSource as never}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : null}
      {isVideo ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          nativeControls={showControls}
          surfaceType={Platform.OS === 'android' ? 'textureView' : undefined}
          onFirstFrameRender={() => {
            setHasRenderedFirstFrame(true);
          }}
        />
      ) : (
        <ExpoImage
          source={{ uri: source } as never}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          cachePolicy="memory-disk"
          onError={() => {
            setImageLoadFailed(true);
          }}
        />
      )}
      {fallbackLabel || imageLoadFailed ? (
        <View className="absolute inset-0 items-center justify-center bg-black/20">
          <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-white">
            {fallbackLabel || 'Media'}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
