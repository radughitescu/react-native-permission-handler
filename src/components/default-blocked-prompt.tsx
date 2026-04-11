import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { BlockedPromptConfig } from "../types";

export interface DefaultBlockedPromptProps extends BlockedPromptConfig {
  visible: boolean;
  onOpenSettings: () => void;
  onDismiss?: () => void;
}

export function DefaultBlockedPrompt({
  visible,
  title,
  message,
  settingsLabel = "Open Settings",
  dismissLabel = "Not Now",
  onOpenSettings,
  onDismiss,
}: DefaultBlockedPromptProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={onOpenSettings}
            accessibilityRole="button"
          >
            <Text style={styles.settingsText}>{settingsLabel}</Text>
          </TouchableOpacity>
          {onDismiss && (
            <TouchableOpacity onPress={onDismiss} accessibilityRole="button">
              <Text style={styles.dismissText}>{dismissLabel}</Text>
            </TouchableOpacity>
          )}
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
  settingsButton: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center",
  },
  settingsText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  dismissText: {
    color: "#007AFF",
    fontSize: 15,
    marginTop: 12,
  },
});
