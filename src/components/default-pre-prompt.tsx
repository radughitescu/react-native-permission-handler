import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { PrePromptConfig } from "../types";

export interface DefaultPrePromptProps extends PrePromptConfig {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DefaultPrePrompt({
  visible,
  title,
  message,
  confirmLabel = "Continue",
  cancelLabel = "Not Now",
  onConfirm,
  onCancel,
}: DefaultPrePromptProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={onConfirm}
            accessibilityRole="button"
          >
            <Text style={styles.confirmText}>{confirmLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onCancel} accessibilityRole="button">
            <Text style={styles.cancelText}>{cancelLabel}</Text>
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
  confirmButton: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  confirmText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelText: {
    color: "#007AFF",
    fontSize: 15,
  },
});
