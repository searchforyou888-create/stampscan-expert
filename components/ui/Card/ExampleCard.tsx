import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Card } from './Card';
import { Badge } from '../Badge/Badge';

export function ExampleCard() {
  const imageUrl = 'https://upload.wikimedia.org/wikipedia/commons/6/6e/Postage_stamp_france_2016.jpg';
  const rarity = 'legendary'; // 'legendary' | 'rare' | 'collectable' | 'common'
  const confidence = 98;

  return (
    <Card variant="elevated" rarity={rarity} style={{ width: 320, margin: 24 }}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.roundedImage}
          resizeMode="cover"
        />
        <View style={styles.confidenceCircle}>
          <Text style={styles.confidenceText}>{confidence}% Match</Text>
        </View>
      </View>
      <Card.Header>
        <Text style={styles.title}>Cérès 1F Carmin</Text>
        <Text style={styles.date}>1849</Text>
      </Card.Header>
      <Card.Content>
        <Text>Premier timbre de France, exemplaire unique en parfait état.</Text>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  roundedImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0F0E8',
    borderWidth: 2,
    borderColor: '#FFF',
    overflow: 'hidden',
  },
  confidenceCircle: {
    position: 'absolute',
    bottom: -12,
    left: '50%',
    transform: [{ translateX: -48 }],
    backgroundColor: '#FFD60A',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#FFD60A',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  confidenceText: {
    color: '#1A1A2E',
    fontWeight: 'bold',
    fontSize: 14,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#1A1A2E',
  },
  date: {
    color: '#8B7E9E',
    fontSize: 14,
    marginTop: 2,
  },
});
