export const uiTokens = {
  spacing: {
    screenX: 20,
    sectionGap: 16,
    cardPadding: 16,
    cardPaddingLg: 20,
    rowY: 14,
  },
  radius: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 28,
    full: 999,
  },
  size: {
    iconSm: 18,
    iconMd: 20,
    iconLg: 24,
    backButton: 40,
    sheetHandleWidth: 48,
    sheetHandleHeight: 6,
  },
  borderWidth: {
    hairline: 1,
  },
} as const;

export type UiTokens = typeof uiTokens;
