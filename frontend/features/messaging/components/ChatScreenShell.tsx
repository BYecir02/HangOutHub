import React, { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

type ChatScreenShellProps = {
  header?: ReactNode;
  children: ReactNode;
  composer?: ReactNode;
  banner?: ReactNode;
  keyboardVerticalOffset?: number;
};

export default function ChatScreenShell({
  header,
  children,
  composer,
  banner,
  keyboardVerticalOffset = 0,
}: ChatScreenShellProps) {
  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={keyboardVerticalOffset}
      className="flex-1 bg-gray-50 dark:bg-black"
    >
      {header || null}
      {banner}
      <View className="flex-1">{children}</View>
      {composer}
    </KeyboardAvoidingView>
  );
}
