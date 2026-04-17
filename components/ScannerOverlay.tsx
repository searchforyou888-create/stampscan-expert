import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const { height } = Dimensions.get('window');
const BORDER_SIZE = 240;

interface ScannerOverlayProps {
  onCapture: () => void;
  isLoading: boolean;
  type: string;
}

export function ScannerOverlay({ onCapture, isLoading, type }: ScannerOverlayProps) {
  // Animation du cadre de scan
  const scanLinePosition = useSharedValue(0);

  useEffect(() => {
    scanLinePosition.value = withRepeat(
      withTiming(BORDER_SIZE - 20, {
        duration: 2000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, [scanLinePosition]);

  const scanLineAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLinePosition.value }],
  }));

  const TYPE_EMOJIS: Record<string, string> = {
    stamp: '🎫',
    coin: '🪙',
    banknote: '💵',
    card: '🎴',
    other: '📦',
  };

  const TYPE_COLORS: Record<string, string[]> = {
    stamp: ['#C8973A', '#8B6A1B'],
    coin: ['#8B7355', '#5C4A33'],
    banknote: ['#2D9B6F', '#1B5A3F'],
    card: ['#3B6FE8', '#2451A8'],
    other: ['#8B7E9E', '#5A4F6D'],
  };

  const gradientColors = TYPE_COLORS[type] || ['#667eea', '#764ba2'];

  return (
    <View style={styles.container}>
      {/* Overlay sombre */}
      <View style={styles.overlay} />

      {/* Cadre de scan principal */}
      <View style={styles.scanFrame}>
        {/* Coins décoratifs */}
        <View style={[styles.corner, styles.topLeft, { borderColor: gradientColors[0] }]} />
        <View style={[styles.corner, styles.topRight, { borderColor: gradientColors[0] }]} />
        <View style={[styles.corner, styles.bottomLeft, { borderColor: gradientColors[0] }]} />
        <View style={[styles.corner, styles.bottomRight, { borderColor: gradientColors[0] }]} />

        {/* Ligne de scan animée */}
        <Animated.View style={[styles.scanLine, scanLineAnimStyle, { backgroundColor: gradientColors[0] }]} />

        {/* Indicateurs de scan */}
        <View style={styles.scanIndicators}>
          <View style={[styles.indicator, { backgroundColor: gradientColors[0] }]} />
          <View style={[styles.indicator, { backgroundColor: gradientColors[0] }]} />
        </View>
      </View>

      {/* Information en haut */}
      <View style={styles.topInfo}>
        <Text style={styles.typeEmoji}>{TYPE_EMOJIS[type]}</Text>
        <Text style={styles.instruction}>Centrez l&apos;objet dans le cadre</Text>
        <Text style={styles.subText}>Bonne lumière, pas de reflets</Text>
      </View>

      {/* Bouton Capturer */}
      <View style={styles.bottomControls}>
        {isLoading ? (
          <LinearGradient colors={[gradientColors[0], gradientColors[1]]} style={styles.loadingButton}>
            <Ionicons name="hourglass" size={24} color="white" />
            <Text style={styles.loadingText}>Scan en cours...</Text>
          </LinearGradient>
        ) : (
          <TouchableOpacity onPress={onCapture} activeOpacity={0.8}>
            <LinearGradient colors={[gradientColors[0], gradientColors[1]]} style={styles.captureButton}>
              <Ionicons name="camera" size={28} color="white" />
              <Text style={styles.buttonText}>Capturer</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Infos supplémentaires */}
        <View style={styles.tipContainer}>
          <Ionicons name="bulb-outline" size={16} color={gradientColors[0]} />
          <Text style={styles.tipText}>Conseil: Scannez une seule pièce à la fois</Text>
        </View>
      </View>

      {/* Pulse d'attente */}
      {isLoading && <PulseAnimation color={gradientColors[0]} />}
    </View>
  );
}

function PulseAnimation({ color }: { color: string }) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.5, {
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 2 - pulse.value,
  }));

  return (
    <Animated.View
      style={[
        styles.pulseRing,
        pulseStyle,
        { borderColor: color, backgroundColor: color + '20' },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },

  scanFrame: {
    width: BORDER_SIZE,
    height: BORDER_SIZE,
    borderWidth: 3,
    borderColor: '#667eea',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(102, 126, 234, 0.05)',
  },

  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
  },

  topLeft: {
    top: -3,
    left: -3,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },

  topRight: {
    top: -3,
    right: -3,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },

  bottomLeft: {
    bottom: -3,
    left: -3,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },

  bottomRight: {
    bottom: -3,
    right: -3,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },

  scanLine: {
    position: 'absolute',
    width: '100%',
    height: 2,
    left: 0,
    top: 0,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },

  scanIndicators: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.6,
  },

  topInfo: {
    position: 'absolute',
    top: height * 0.15,
    width: '100%',
    alignItems: 'center',
  },

  typeEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },

  instruction: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },

  subText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
  },

  bottomControls: {
    position: 'absolute',
    bottom: height * 0.1,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  captureButton: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  loadingButton: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    opacity: 0.7,
  },

  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  loadingText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },

  tipContainer: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },

  tipText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },

  pulseRing: {
    position: 'absolute',
    borderRadius: BORDER_SIZE / 2 + 30,
    width: BORDER_SIZE + 60,
    height: BORDER_SIZE + 60,
    borderWidth: 2,
  },
});
