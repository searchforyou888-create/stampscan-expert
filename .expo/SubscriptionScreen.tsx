import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export function SubscriptionScreen({ onUpgrade }: { onUpgrade: (plan: any) => void }) {
  const tiers = [
    { id: 'FREE', name: 'Découverte', price: '0€', desc: '3 scans gratuits' },
    { id: 'PREMIUM', name: 'Passionné', price: '9.99€', desc: '50 scans / mois' },
    { id: 'PLATINUM', name: 'Expert', price: '19.99€', desc: 'Scans illimités & Historique' },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Choisissez votre plan</Text>
      {tiers.map((tier) => (
        <View key={tier.id} style={styles.card}>
          <Text style={styles.planName}>{tier.name}</Text>
          <Text style={styles.price}>{tier.price}</Text>
          <Text style={styles.desc}>{tier.desc}</Text>
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => onUpgrade(tier.id)}
          >
            <Text style={styles.buttonText}>Sélectionner</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F2F2F7' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 15, marginBottom: 15, alignItems: 'center', elevation: 3 },
  planName: { fontSize: 18, fontWeight: '600' },
  price: { fontSize: 32, fontWeight: 'bold', color: '#007AFF', marginVertical: 10 },
  desc: { color: '#666', marginBottom: 15 },
  button: { backgroundColor: '#007AFF', paddingHorizontal: 30, paddingVertical: 10, borderRadius: 20 },
  buttonText: { color: 'white', fontWeight: 'bold' }
});