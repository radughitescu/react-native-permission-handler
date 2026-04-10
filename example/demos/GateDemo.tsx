import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { CAMERA, styles } from "./shared";

export default function GateDemo() {
  const [nativeAvailable, setNativeAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const rnp = require("react-native-permissions");
      rnp.check("ios.permission.CAMERA").then(() => {
        setNativeAvailable(true);
      }).catch((e: any) => {
        setNativeAvailable(false);
        setError(e.message);
      });
    } catch (e: any) {
      setNativeAvailable(false);
      setError(e.message);
    }
  }, []);

  if (nativeAvailable === null) {
    return (
      <View style={styles.demoCard}>
        <Text style={styles.demoTitle}>{"<PermissionGate>"}</Text>
        <Text style={styles.demoSubtitle}>Checking native module...</Text>
      </View>
    );
  }

  if (!nativeAvailable) {
    return (
      <View style={styles.demoCard}>
        <Text style={styles.demoTitle}>{"<PermissionGate>"}</Text>
        <Text style={styles.demoSubtitle}>Native module not available</Text>
        <View style={{ backgroundColor: "#FFF3CD", borderRadius: 10, padding: 16, marginTop: 8 }}>
          <Text style={{ fontSize: 14, color: "#856404", marginBottom: 8, fontWeight: "600" }}>
            react-native-permissions TurboModule not found
          </Text>
          <Text style={{ fontSize: 13, color: "#856404", lineHeight: 20 }}>
            See the usePermissionHandler demo for details on this known issue.
          </Text>
        </View>
      </View>
    );
  }

  const { PermissionGate } = require("react-native-permission-handler");

  return (
    <View style={styles.demoCard}>
      <Text style={styles.demoTitle}>{"<PermissionGate>"}</Text>
      <Text style={styles.demoSubtitle}>Declarative camera gate</Text>

      <PermissionGate
        permission={CAMERA}
        prePrompt={{
          title: "Camera Access",
          message: "We need your camera to scan QR codes.",
        }}
        blockedPrompt={{
          title: "Camera Blocked",
          message: "Please enable camera in Settings.",
        }}
        fallback={<Text style={styles.fallback}>Checking permission...</Text>}
      >
        <View style={styles.grantedBox}>
          <Text style={styles.grantedText}>
            Camera is granted! This content is only visible when permission is active.
          </Text>
        </View>
      </PermissionGate>
    </View>
  );
}
