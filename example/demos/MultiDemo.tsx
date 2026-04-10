import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { CAMERA, MICROPHONE, styles } from "./shared";

export default function MultiDemo() {
  const [nativeAvailable, setNativeAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const rnp = require("react-native-permissions");
      rnp.check("ios.permission.CAMERA").then(() => {
        setNativeAvailable(true);
      }).catch(() => {
        setNativeAvailable(false);
      });
    } catch {
      setNativeAvailable(false);
    }
  }, []);

  if (nativeAvailable === null) {
    return (
      <View style={styles.demoCard}>
        <Text style={styles.demoTitle}>useMultiplePermissions</Text>
        <Text style={styles.demoSubtitle}>Checking native module...</Text>
      </View>
    );
  }

  if (!nativeAvailable) {
    return (
      <View style={styles.demoCard}>
        <Text style={styles.demoTitle}>useMultiplePermissions</Text>
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

  return <MultiDemoFull />;
}

function MultiDemoFull() {
  const { useMultiplePermissions } = require("react-native-permission-handler");

  const perms = useMultiplePermissions({
    permissions: [
      {
        permission: CAMERA,
        prePrompt: { title: "Camera", message: "Needed for video calls." },
        blockedPrompt: { title: "Camera Blocked", message: "Enable in Settings." },
        onGrant: () => console.log("Camera granted"),
        onDeny: () => console.log("Camera denied"),
      },
      {
        permission: MICROPHONE,
        prePrompt: { title: "Microphone", message: "Needed for audio in calls." },
        blockedPrompt: { title: "Mic Blocked", message: "Enable in Settings." },
        onGrant: () => console.log("Mic granted"),
        onDeny: () => console.log("Mic denied"),
      },
    ],
    strategy: "sequential",
    onAllGranted: () => console.log("All permissions granted!"),
  });

  return (
    <View style={styles.demoCard}>
      <Text style={styles.demoTitle}>useMultiplePermissions</Text>
      <Text style={styles.demoSubtitle}>Camera + Microphone (sequential)</Text>

      {Object.entries(perms.statuses).map(([key, status]) => (
        <View key={key} style={styles.statusRow}>
          <Text style={styles.label}>{key.split(".").pop()}:</Text>
          <Text style={styles.value}>{String(status)}</Text>
        </View>
      ))}

      <View style={styles.statusRow}>
        <Text style={styles.label}>All granted:</Text>
        <Text style={[styles.value, perms.allGranted && styles.granted]}>
          {perms.allGranted ? "YES" : "NO"}
        </Text>
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={perms.request}>
        <Text style={styles.primaryBtnText}>Request All</Text>
      </TouchableOpacity>

      {perms.allGranted && (
        <View style={styles.grantedBox}>
          <Text style={styles.grantedText}>Video call ready!</Text>
        </View>
      )}
    </View>
  );
}
