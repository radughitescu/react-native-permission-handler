import { Text, TouchableOpacity, View } from "react-native";
import { PermissionGate } from "react-native-permission-handler";
import { CAMERA, styles } from "./shared";

export default function GateDemo() {
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
          dismissLabel: "Maybe Later",
        }}
        fallback={<Text style={styles.fallback}>Checking permission...</Text>}
        renderDenied={({ check }) => (
          <View>
            <Text style={styles.fallback}>Camera permission not granted.</Text>
            <TouchableOpacity style={styles.outlineBtn} onPress={check}>
              <Text style={styles.outlineBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
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
