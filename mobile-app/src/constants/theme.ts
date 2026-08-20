/**
 * Buzz Chat Instagram-dark design tokens.
 * Screens should prefer these over hardcoded slate/indigo/pink.
 */

import { Platform } from 'react-native';

export const IG = {
  bg: '#000000',
  surface: '#121212',
  elevated: '#1A1A1A',
  border: '#262626',
  text: '#F5F5F5',
  textSecondary: '#A8A8A8',
  textMuted: '#737373',
  accent: '#0095F6',
  like: '#FF3040',
  danger: '#ED4956',
  success: '#10B981',
  tabBar: '#000000',
  tabInactive: '#A8A8A8',
  tabActive: '#FFFFFF',
} as const;

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: IG.text,
    background: IG.bg,
    backgroundElement: IG.surface,
    backgroundSelected: IG.elevated,
    textSecondary: IG.textSecondary,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
