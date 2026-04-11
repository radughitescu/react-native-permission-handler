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

  const active = perms.activePermission;
  const activeHandler = active ? perms.handlers[active] : null;
  const activeState = activeHandler?.state;

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
              (status === "granted" || status === "limited") && styles.granted,
              (status === "blockedPrompt" || status === "blocked") && { color: "#FF3B30" },
              active === key && { fontWeight: "800" },
            ]}
          >
            {String(status)}
            {active === key ? " (active)" : ""}
          </Text>
        </View>
      ))}

      <View style={styles.statusRow}>
        <Text style={styles.label}>All granted:</Text>
        <Text style={[styles.value, perms.allGranted && styles.granted]}>
          {perms.allGranted ? "YES" : "NO"}
        </Text>
      </View>

      {perms.blockedPermissions.length > 0 && (
        <View style={styles.statusRow}>
          <Text style={styles.label}>Blocked:</Text>
          <Text style={[styles.value, { color: "#FF3B30" }]}>
            {perms.blockedPermissions.map((k) => k.split(".").pop()).join(", ")}
          </Text>
        </View>
      )}

      {/* Start flow button — show when no active permission and not all granted */}
      {!active && !perms.allGranted && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryBtn} onPress={perms.request}>
            <Text style={styles.primaryBtnText}>Request All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={perms.reset}>
            <Text style={styles.secondaryBtnText}>Reset</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Pre-prompt actions for the active permission */}
      {activeHandler && activeState === "prePrompt" && (
        <View style={styles.activePrompt}>
          <Text style={styles.activePromptTitle}>
            Allow {active?.split(".").pop()}?
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={activeHandler.request}>
              <Text style={styles.primaryBtnText}>Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={activeHandler.dismiss}>
              <Text style={styles.secondaryBtnText}>Not Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Blocked actions for the active permission */}
      {activeHandler && activeState === "blockedPrompt" && (
        <View style={styles.activePrompt}>
          <Text style={styles.activePromptTitle}>
            {active?.split(".").pop()} is blocked
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: "#FF9500" }]}
              onPress={activeHandler.openSettings}
            >
              <Text style={styles.primaryBtnText}>Open Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={activeHandler.dismissBlocked}>
              <Text style={styles.secondaryBtnText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {perms.allGranted && (
        <View style={styles.grantedBox}>
          <Text style={styles.grantedText}>Video call ready!</Text>
        </View>
      )}
    </View>
  );
}
