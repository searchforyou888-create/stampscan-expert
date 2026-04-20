import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type RarityLevel = 'legendary' | 'rare' | 'collectable' | 'common';

interface BadgeProps {
  level: RarityLevel;
  label?: string;
}

export function Badge({ level, label }: BadgeProps) {
  let style, textStyle;
  switch (level) {
    case 'legendary':
      style = [styles.badge, styles.legendary];
      textStyle = styles.legendaryText;
      break;
    case 'rare':
      style = [styles.badge, styles.rare];
      textStyle = styles.rareText;
      break;
    case 'collectable':
      style = [styles.badge, styles.collectable];
      textStyle = styles.collectableText;
      break;
    case 'common':
    default:
      style = [styles.badge, styles.common];
      textStyle = styles.commonText;
      break;
  }
  return (
    <View style={style}>
      <Text style={textStyle}>{label ?? level.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    alignSelf: 'flex-start',
    margin: 4,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendary: {
    backgroundColor: '#C5A059',
    borderWidth: 2,
    borderColor: '#FFF8E1',
    borderStyle: 'double',
    shadowColor: '#C5A059',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 8,
  },
  legendaryText: {
    color: '#FFF8E1',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  rare: {
    backgroundColor: '#A8A8A8',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#A8A8A8',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  rareText: {
    color: '#F8F8F8',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  collectable: {
    backgroundColor: '#4A90E2',
  },
  collectableText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  common: {
    backgroundColor: '#323232',
    opacity: 0.7,
  },
  commonText: {
    color: '#F0F0F0',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
