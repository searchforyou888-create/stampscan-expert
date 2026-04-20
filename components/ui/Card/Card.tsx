/**
 * Card Component (Compound Component Pattern)
 *
 * Production-quality card with compound sub-components to avoid prop explosion.
 * Follows React best practices for composition over configuration.
 *
 * Features:
 * - 3 variants: flat, elevated, outlined
 * - Compound components: Card.Header, Card.Image, Card.Content, Card.Footer
 * - Pressable variant with animation
 * - Flexible composition
 * - All design tokens (zero hardcoded values)
 *
 * @example
 * ```tsx
 * import { Card } from '@/components/ui';
 *
 * // Simple card
 * <Card variant="elevated">
 *   <Card.Content>
 *     <Text>Card content</Text>
 *   </Card.Content>
 * </Card>
 *
 * // Full featured card
 * <Card variant="elevated" onPress={handlePress}>
 *   <Card.Image source={{ uri: imageUrl }} />
 *   <Card.Header>
 *     <Text>Title</Text>
 *   </Card.Header>
 *   <Card.Content>
 *     <Text>Description text here</Text>
 *   </Card.Content>
 *   <Card.Footer>
 *     <Button>Action</Button>
 *   </Card.Footer>
 * </Card>
 * ```
 */

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, spacing, shadows, borderRadius } from '@/constants/design';
import { animationTimings } from '@/constants/animations';
import type { CardProps } from './Card.types';
import { Badge } from '../Badge/Badge';

// ============================================================================
// Main Card Component
// ============================================================================

export function Card({
  children,
  variant = 'elevated',
  onPress,
  style,
  testID,
  rarity,
}: CardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98, animationTimings.springSnappy);
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withSpring(1, animationTimings.springSnappy);
    }
  };

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  const cardContent = (
    <View
      style={[
        styles.card,
        styles[`card_${variant}`],
        style,
      ]}
      testID={testID}
    >
      {/* Badge de rareté en position absolue en haut à droite */}
      {rarity && (
        <View style={styles.rarityBadgeContainer} pointerEvents="none">
          <Badge level={rarity} />
        </View>
      )}
      {children}
    </View>
  );


  if (onPress) {
    return (
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.95}
          accessibilityRole="button"
        >
          {cardContent}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return cardContent;
}

// ============================================================================
// Card.Header Sub-component
// ============================================================================

function CardHeader({ children }: CardHeaderProps) {
  return (
    <View style={styles.header}>
      {children}
    </View>
  );
}

Card.Header = CardHeader;

// ============================================================================
// Card.Image Sub-component
// ============================================================================

function CardImage({
  source,
  aspectRatio = 16 / 9,
  rounded = false,
}: CardImageProps) {
  return (
    <Image
      source={source}
      style={[
        styles.image,
        { aspectRatio },
        rounded && styles.imageRounded,
      ]}
      resizeMode="cover"
    />
  );
}

Card.Image = CardImage;

// ============================================================================
// Card.Content Sub-component
// ============================================================================

function CardContent({ children }: CardContentProps) {
  return (
    <View style={styles.content}>
      {children}
    </View>
  );
}

Card.Content = CardContent;

// ============================================================================
// Card.Footer Sub-component
// ============================================================================

function CardFooter({ children }: CardFooterProps) {
  return (
    <View style={styles.footer}>
      {children}
    </View>
  );
}

Card.Footer = CardFooter;

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  // Base card styles
  card: {
    backgroundColor: colors.background,
    borderRadius: 25,
    overflow: 'hidden',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    ...shadows.lg,
  },

  // Variant: Flat (no shadow, no border)
  card_flat: {
    backgroundColor: colors.backgroundSecondary,
  },

  // Variant: Elevated (shadow)
  card_elevated: {
    backgroundColor: colors.background,
    ...shadows.md,
  },

  // Variant: Outlined (border, no shadow)
  card_outlined: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Header
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },

  // Image
  image: {
    width: '100%',
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    overflow: 'hidden',
  },

  imageRounded: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },

  // Content
  content: {
    padding: spacing.lg,
  },

  // Footer
  footer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
});
