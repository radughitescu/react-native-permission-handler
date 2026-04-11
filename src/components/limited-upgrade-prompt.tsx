import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export interface LimitedUpgradePromptProps {
  visible: boolean;
  title: string;
  message: string;
  upgradeLabel?: string;
  dismissLabel?: string;
  onUpgrade: () => void;
  onDismiss: () => void;
}

export function LimitedUpgradePrompt({
  visible,
  title,
  message,
  upgradeLabel = "Allow Full Access",
  dismissLabel = "Keep Current Selection",
  onUpgrade,
  onDismiss,
}: LimitedUpgradePromptProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={onUpgrade}
            accessibilityRole="button"
          >
            <Text style={styles.upgradeText}>{upgradeLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDismiss} accessibilityRole="button">
            <Text style={styles.dismissText}>{dismissLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    width: "85%",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  upgradeButton: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  upgradeText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  dismissText: {
    color: "#007AFF",
    fontSize: 15,
  },
});
