import React, { type ReactNode } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { uiTokens } from '@/theme/tokens';

type BottomSheetModalProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxHeight?: number;
  closeOnOverlayPress?: boolean;
  contentMode?: 'fill' | 'auto';
};

export default function BottomSheetModal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxHeight = 560,
  closeOnOverlayPress = true,
  contentMode = 'fill',
}: BottomSheetModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0 bg-black/60"
          onPress={closeOnOverlayPress ? onClose : undefined}
        />
        <Pressable>
          <View
            className="w-full rounded-t-3xl border-t border-gray-200 bg-white px-5 pb-8 pt-4 dark:border-gray-800 dark:bg-gray-900"
            style={{
              maxHeight,
              borderTopLeftRadius: uiTokens.radius.xl,
              borderTopRightRadius: uiTokens.radius.xl,
              borderTopWidth: uiTokens.borderWidth.hairline,
              paddingHorizontal: uiTokens.spacing.screenX,
              paddingTop: uiTokens.spacing.rowY,
              paddingBottom: uiTokens.spacing.cardPaddingLg + 12,
            }}
          >
            <View className="mb-4 items-center">
              <View
                className="bg-gray-300 dark:bg-gray-700"
                style={{
                  width: uiTokens.size.sheetHandleWidth,
                  height: uiTokens.size.sheetHandleHeight,
                  borderRadius: uiTokens.radius.full,
                }}
              />
            </View>

            {title || subtitle ? (
              <View className="mb-4 flex-row items-start justify-between">
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

            <View className={contentMode === 'fill' ? 'flex-1' : 'min-h-[1px]'}>
              {children}
            </View>
            {footer ? <View className="mt-4">{footer}</View> : null}
          </View>
        </Pressable>
      </View>
    </Modal>
  );
}
