/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * Palette ShowTime — "sala cinema al tramonto".
 * Base blu notte con glow blu freddo (sinistra) e arancio caldo (destra).
 */
export const Brand = {
  nightBlue: '#0B0E1A',
  deepBlue: '#121528',
  glowBlue: '#2F6BFF',
  sunsetOrange: '#FF6A2C',
  softViolet: '#6A4CFF',
  pureWhite: '#FFFFFF',
} as const;

export const Colors = {
  dark: {
    text: '#FFFFFF',
    background: '#040212',
    backgroundElement: '#121528',
    backgroundSelected: '#1C2038',
    textSecondary: '#A7ADC4',
    tint: Brand.glowBlue,
    accent: Brand.sunsetOrange,
  },
} as const;

export type ThemeColor = keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
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
export const WebTabTopInset = Spacing.six + Spacing.three;
export const MaxContentWidth = 800;
