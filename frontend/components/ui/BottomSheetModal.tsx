import React, { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  type BottomSheetMethods,
} from '@gorhom/bottom-sheet';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { uiTokens } from '@/theme/tokens';

type BottomSheetModalProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  heroContent?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxHeight?: number;
  closeOnOverlayPress?: boolean;
  backdropOpacity?: number;
  contentMode?: 'fill' | 'auto';
};

export default function BottomSheetModal({
  visible,
  onClose,
  title,
  subtitle,
  heroContent,
  children,
  footer,
  maxHeight = 560,
  closeOnOverlayPress = true,
  backdropOpacity,
  contentMode = 'fill',
}: BottomSheetModalProps) {
  const isDark = useColorScheme() === 'dark';
  const sheetBackgroundColor = isDark ? '#111827' : '#ffffff';
  const sheetRadius = 28;
  const { height: screenHeight } = Dimensions.get('window');
  const insets = useSafeAreaInsets();
  const [isRendered, setIsRendered] = useState(visible);
  const sheetRef = useRef<BottomSheetMethods>(null);
  const snapPoints = useMemo(() => [maxHeight], [maxHeight]);
  const containerLayoutState = useSharedValue({
    height: screenHeight,
    offset: {
      top: insets.top,
      right: 0,
      bottom: insets.bottom,
      left: 0,
    },
  });

  useEffect(() => {
    containerLayoutState.value = {
      height: screenHeight,
      offset: {
        top: insets.top,
        right: 0,
        bottom: insets.bottom,
        left: 0,
      },
    };
  }, [containerLayoutState, insets.bottom, insets.top, screenHeight]);

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      return;
    }

    sheetRef.current?.close();
  }, [visible]);

  const handleSheetIndexChange = (index: number) => {
    if (index === -1) {
      setIsRendered(false);
      onClose();
    }
  };

  if (!isRendered) {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      animateOnMount
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      onChange={handleSheetIndexChange}
      containerLayoutState={containerLayoutState}
      backgroundStyle={{
        backgroundColor: sheetBackgroundColor,
        borderTopLeftRadius: sheetRadius,
        borderTopRightRadius: sheetRadius,
      }}
      backdropComponent={(backdropProps) => (
        <BottomSheetBackdrop
          {...backdropProps}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          pressBehavior={closeOnOverlayPress ? 'close' : 'none'}
          opacity={backdropOpacity ?? (isDark ? 0.55 : 0.45)}
        />
      )}
      style={{
        shadowColor: '#000',
        shadowOpacity: 0.16,
        shadowRadius: 18,
        elevation: 12,
      }}
    >
      {title || subtitle ? (
        <View
          className="flex-row items-start justify-between"
          style={{
            backgroundColor: sheetBackgroundColor,
            paddingHorizontal: uiTokens.spacing.screenX,
            paddingTop: uiTokens.spacing.rowY,
            paddingBottom: uiTokens.spacing.rowY,
            borderTopLeftRadius: sheetRadius,
            borderTopRightRadius: sheetRadius,
          }}
        >
          <View className="flex-1 pr-3">
            {title ? (
              <Text className="text-lg font-bold text-gray-900 dark:text-white">
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {subtitle}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={onClose}
            className="bg-gray-100 p-2 dark:bg-gray-800"
            style={{ borderRadius: uiTokens.radius.full }}
          >
            <Ionicons name="close" size={uiTokens.size.iconSm} color="#6b7280" />
          </TouchableOpacity>
        </View>
      ) : null}

      <BottomSheetScrollView
        className="w-full"
        style={{
          flex: 1,
          backgroundColor: sheetBackgroundColor,
          borderTopLeftRadius: sheetRadius,
          borderTopRightRadius: sheetRadius,
          paddingHorizontal: uiTokens.spacing.screenX,
          paddingTop: uiTokens.spacing.rowY,
          paddingBottom: uiTokens.spacing.cardPaddingLg + 12,
        }}
        contentContainerStyle={{
          paddingBottom: uiTokens.spacing.cardPaddingLg + 12,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className={contentMode === 'fill' ? 'flex-1' : 'min-h-[1px]'}>
          {heroContent ? <View className="mb-4 items-center">{heroContent}</View> : null}

          {children}
          {footer ? <View className="mt-4">{footer}</View> : null}
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
