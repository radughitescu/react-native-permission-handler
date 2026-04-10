import { Linking, Platform, Text, TouchableOpacity, View } from "react-native";
import { openSettings } from "react-native-permissions";
import { useMultiplePermissions } from "react-native-permission-handler";
import { CAMERA, MICROPHONE, styles } from "./shared";

const hasBlocked = (statuses: Record<string, string>) =>
  Object.values(statuses).some((s) => s === "blockedPrompt" || s === "blocked");

const allIdle = (statuses: Record<string, string>) =>
  Object.values(statuses).every((s) => s === "idle");

export default function MultiDemo() {
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

  const blocked = hasBlocked(perms.statuses);

  return (
    <View style={styles.demoCard}>
      <Text style={styles.demoTitle}>useMultiplePermissions</Text>
      <Text style={styles.demoSubtitle}>Camera + Microphone (sequential)</Text>

      {Object.entries(perms.statuses).map(([key, status]) => (
        <View key={key} style={styles.statusRow}>
          <Text style={styles.label}>{key.split(".").pop()}:</Text>
          <Text
            style={[
              styles.value,
              status === "granted" && styles.granted,
              (status === "blockedPrompt" || status === "blocked") && { color: "#FF3B30" },
            ]}
          >
            {String(status)}
          </Text>
        </View>
      ))}

      <View style={styles.statusRow}>
        <Text style={styles.label}>All granted:</Text>
        <Text style={[styles.value, perms.allGranted && styles.granted]}>
          {perms.allGranted ? "YES" : "NO"}
        </Text>
      </View>

      {!perms.allGranted && !blocked && (
        <TouchableOpacity style={styles.primaryBtn} onPress={perms.request}>
          <Text style={styles.primaryBtnText}>Request All</Text>
        </TouchableOpacity>
      )}

      {blocked && (
        <>
          <View style={{ backgroundColor: "#FFF3CD", borderRadius: 10, padding: 14, marginTop: 12 }}>
            <Text style={{ fontSize: 14, color: "#664D03", lineHeight: 20 }}>
              One or more permissions are blocked. Open Settings to enable them, then come back.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: "#FF9500" }]}
            onPress={() => openSettings()}
          >
            <Text style={styles.primaryBtnText}>Open Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineBtn} onPress={perms.request}>
            <Text style={styles.outlineBtnText}>Re-check</Text>
          </TouchableOpacity>
        </>
      )}

      {perms.allGranted && (
        <View style={styles.grantedBox}>
          <Text style={styles.grantedText}>Video call ready!</Text>
        </View>
      )}
    </View>
  );
}
