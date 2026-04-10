import { Text, TouchableOpacity, View } from "react-native";
import { useMultiplePermissions } from "react-native-permission-handler";
import { CAMERA, MICROPHONE, styles } from "./shared";

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
