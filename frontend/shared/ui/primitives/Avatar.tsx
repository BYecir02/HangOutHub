import React, { useEffect, useMemo, useState } from 'react';
import { Image, Text, View, type StyleProp, type ViewStyle } from 'react-native';

type AvatarProps = {
  uri?: string | null;
  label?: string | null;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  style?: StyleProp<ViewStyle>;
};

function getInitials(label?: string | null) {
  const trimmed = label?.trim();

  if (!trimmed) {
    return '?';
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  const first = parts[0]?.charAt(0) || '';
  const second = parts.length > 1 ? parts[1]?.charAt(0) || '' : '';

  return `${first}${second}`.trim().toUpperCase() || '?';
}

export default function Avatar({
  uri,
  label,
  size = 40,
  backgroundColor = '#eef2ff',
  textColor = '#4c669f',
  borderColor,
  borderWidth = 0,
  style,
}: AvatarProps) {
  const initials = useMemo(() => getInitials(label), [label]);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [uri]);

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          borderColor,
          borderWidth,
        },
        style,
      ]}
      className="overflow-hidden"
    >
      {uri && !imageFailed ? (
        <Image
          source={{ uri }}
          resizeMode="cover"
          style={{ width: size, height: size, borderRadius: size / 2 }}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: textColor }} className="text-sm font-semibold">
            {initials}
          </Text>
        </View>
      )}
    </View>
  );
}
