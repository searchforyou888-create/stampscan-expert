import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/constants/design';

interface QRCodeShareProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  shareUrl: string;
  downloadLabel?: string;
}

export function QRCodeShare({
  visible,
  onClose,
  title = 'Partager cette collection',
  shareUrl,
  downloadLabel = 'Télécharger le QR Code',
}: QRCodeShareProps) {
  const [loading, setLoading] = React.useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      // Placeholder: In a real app, you'd implement download logic
      Alert.alert('Succès', 'QR Code téléchargé avec succès!');
    } catch {
      Alert.alert('Erreur', 'Erreur lors du téléchargement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* QR Code */}
          <View style={styles.qrContainer}>
            <View style={styles.qrWrapper}>
              <QRCode
                value={shareUrl}
                size={250}
                backgroundColor={colors.background}
                color={colors.text}
              />
            </View>
            <Text style={styles.urlText}>{shareUrl}</Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.downloadButton]}
              onPress={handleDownload}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <>
                  <Ionicons name="download" size={18} color={colors.background} />
                  <Text style={styles.downloadButtonText}>{downloadLabel}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.closeButtonAlt]}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  closeButton: {
    padding: spacing.sm,
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  qrWrapper: {
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  urlText: {
    marginTop: spacing.md,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.sm,
  },
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  downloadButton: {
    backgroundColor: colors.primary,
  },
  downloadButtonText: {
    color: colors.background,
    fontWeight: '600',
    fontSize: 14,
  },
  closeButtonAlt: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  closeButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
});
