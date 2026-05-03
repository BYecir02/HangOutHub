import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import ScreenState from '@/shared/ui/ScreenState';

interface SocialEmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

export default function SocialEmptyState({
  icon,
  title,
  description,
}: SocialEmptyStateProps) {
  return (
    <ScreenState
      mode="empty"
      variant="plain"
      icon={icon}
      iconColor="#4c669f"
      title={title}
      description={description}
    />
  );
}
