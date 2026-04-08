import React, { type ReactNode } from 'react';
import { Text, TouchableOpacity, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

type ListItemProps = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  withBorder?: boolean;
  compact?: boolean;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  contentClassName?: string;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
};

export default function ListItem({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  disabled = false,
  withBorder = true,
  compact = false,
  className = '',
  titleClassName = '',
  subtitleClassName = '',
  contentClassName = '',
  style,
  titleStyle,
  subtitleStyle,
}: ListItemProps) {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      onPress={onPress}
      activeOpacity={0.9}
      disabled={disabled || !onPress}
      className={`flex-row items-center ${compact ? 'px-4 py-3' : 'px-4 py-4'} ${withBorder ? 'border-b border-gray-100 dark:border-gray-800' : ''} ${disabled ? 'opacity-60' : ''} ${className}`.trim()}
      style={style}
    >
      {leading ? <View className="mr-3">{leading}</View> : null}

      <View className={`min-w-0 flex-1 ${contentClassName}`.trim()}>
        <Text
          className={`text-base text-gray-700 dark:text-white ${titleClassName}`.trim()}
          style={titleStyle}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            className={`mt-1 text-xs text-gray-500 dark:text-gray-400 ${subtitleClassName}`.trim()}
            style={subtitleStyle}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {trailing ? <View className="ml-3 flex-shrink-0">{trailing}</View> : null}
    </Container>
  );
}