/**
 * Design Token System
 *
 * Centralized design tokens for consistent theming across the app.
 * Based on competitive analysis of v0 and Rork mobile patterns.
 *
 * USAGE:
 * import { colors, spacing, typography, shadows, borderRadius } from '@/constants/design';
 *
 * const styles = StyleSheet.create({
 *   container: {
 *     backgroundColor: colors.background,
 *     padding: spacing.md,
 *     borderRadius: borderRadius.lg,
 *     ...shadows.md,
 *   },
 * });
 */

// ============================================================================
// COLORS
// ============================================================================

export const colors = {
  // Brand - Warm Gold (collector/antique feel)
  primary: '#C8973A',
  primaryDark: '#A67A28',
  primaryLight: '#E8B86D',
  primaryTint: '#FDF3E3',

  secondary: '#1A1A2E',
  secondaryDark: '#0D0D1A',
  secondaryLight: '#2D2D4E',
  secondaryTint: '#F5F0E8',

  accent: '#E8B86D',
  accentDark: '#C8973A',
  accentLight: '#F5D49A',
  accentTint: '#FEFAEF',

  // Backgrounds
  background: '#F5F0E8',
  backgroundSecondary: '#EDE6D8',
  backgroundTertiary: '#E2D9C8',

  // Dark Mode
  backgroundDark: '#0D0D1A',
  backgroundDarkSecondary: '#1A1A2E',
  backgroundDarkTertiary: '#2D2D4E',

  // Text
  text: '#1A1A2E',
  textSecondary: '#4A4060',
  textTertiary: '#8B7E9E',
  textDisabled: '#C4BAD4',

  // Dark Mode Text
  textDark: '#F5F0E8',
  textDarkSecondary: '#D4C9B8',
  textDarkTertiary: '#8B7E9E',

  // Semantic
  success: '#2D9B6F',
  successDark: '#1E7050',
  successLight: '#4DB88A',
  successTint: '#D4F0E4',

  error: '#D94040',
  errorDark: '#B32020',
  errorLight: '#F06060',
  errorTint: '#FDEAEA',

  warning: '#E8A020',
  warningDark: '#C07A10',
  warningLight: '#F5C040',
  warningTint: '#FEF3D0',

  info: '#3B6FE8',
  infoDark: '#2A50C0',
  infoLight: '#6090F0',
  infoTint: '#E0EAFF',

  // Border
  border: '#D4C9B8',
  borderDark: '#BFB0A0',
  borderLight: '#EDE6D8',

  borderDarkMode: '#2D2D4E',
  borderDarkModeLight: '#3D3D5E',

  // Overlay
  overlay: 'rgba(26, 26, 46, 0.6)',
  overlayLight: 'rgba(26, 26, 46, 0.3)',
  overlayDark: 'rgba(26, 26, 46, 0.8)',

  // Special
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Collection type colors
  stamp: '#C8973A',
  coin: '#8B7355',
  banknote: '#2D9B6F',
  card: '#3B6FE8',
  other: '#8B7E9E',
};

// ============================================================================
// SPACING
// ============================================================================

/**
 * Spacing scale based on 8pt grid
 * Use for padding, margin, gap
 */
export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  xxxxl: 96,
};

// ============================================================================
// TYPOGRAPHY
// ============================================================================

/**
 * Typography presets
 * Use with spread operator: { ...typography.h1 }
 */
export const typography = {
  display: {
    fontSize: 40,
    fontWeight: '700' as const,
    lineHeight: 48,
    letterSpacing: -0.5,
  },
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.4,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    letterSpacing: 0,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: 0,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    letterSpacing: 0,
  },
  captionBold: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
    letterSpacing: 0,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    letterSpacing: 0,
  },
  smallBold: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
    letterSpacing: 0,
  },
  tiny: {
    fontSize: 10,
    fontWeight: '400' as const,
    lineHeight: 12,
    letterSpacing: 0,
  },
};

// ============================================================================
// SHADOWS
// ============================================================================

/**
 * Shadow presets for iOS (shadowColor, shadowOffset, etc.)
 * and Android (elevation)
 * Use with spread operator: { ...shadows.md }
 */
export const shadows = {
  none: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  xxl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 20,
  },
};

// ============================================================================
// BORDER RADIUS
// ============================================================================

/**
 * Border radius scale
 * Use for consistent rounded corners
 */
export const borderRadius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  xxxl: 32,
  full: 9999,
};

// ============================================================================
// TOUCH TARGETS
// ============================================================================

/**
 * Minimum touch target sizes
 * iOS HIG: 44x44 points
 * Android Material: 48x48dp
 */
export const touchTargets = {
  minimum: 44,      // iOS HIG minimum
  comfortable: 48,  // Android Material minimum
  large: 56,        // Large touch targets for primary actions
};

// ============================================================================
// OPACITY
// ============================================================================

/**
 * Opacity values for different states
 */
export const opacity = {
  disabled: 0.4,
  pressed: 0.7,
  hover: 0.8,
  overlay: 0.5,
  overlayLight: 0.3,
  overlayDark: 0.7,
};

// ============================================================================
// Z-INDEX
// ============================================================================

/**
 * Z-index scale for layering
 */
export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  modalBackdrop: 400,
  modal: 500,
  popover: 600,
  tooltip: 700,
};

// ============================================================================
// ICON SIZES
// ============================================================================

/**
 * Standard icon sizes
 */
export const iconSize = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
};

// ============================================================================
// AVATAR SIZES
// ============================================================================

/**
 * Standard avatar sizes
 */
export const avatarSize = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
  xxl: 120,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get color with opacity
 * @param color - Hex color (e.g., '#2563EB')
 * @param opacity - Opacity value 0-1 (e.g., 0.5)
 */
export const withOpacity = (color: string, opacity: number): string => {
  // Convert hex to rgba
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * Get dark mode color based on current theme
 * @param lightColor - Color for light mode
 * @param darkColor - Color for dark mode
 * @param isDark - Current theme mode
 */
export const getThemedColor = (
  lightColor: string,
  darkColor: string,
  isDark: boolean
): string => {
  return isDark ? darkColor : lightColor;
};
