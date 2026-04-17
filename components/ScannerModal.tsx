// components/ScanerModal.tsx
import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScannerOverlay } from './ScannerOverlay';

interface ScannerModalProps {
  visible: boolean;
  isLoading: boolean;
  type: string;
  onCapture: () => void;
  onClose: () => void;
}

export function ScannerModal({
  visible,
  isLoading,
  type,
  onCapture,
  onClose,
}: ScannerModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <ScannerOverlay
          onCapture={onCapture}
          isLoading={isLoading}
          type={type}
        />

        {/* Bouton Fermer */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>

        {/* Indicateur Flash */}
        <View style={styles.flashIndicator}>
          <Ionicons name="flash-off" size={16} color="rgba(255,255,255,0.7)" />
          <Text style={styles.flashText}>Flash: Off</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },

  flashIndicator: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },

  flashText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
});
