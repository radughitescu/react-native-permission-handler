import { Text, TouchableOpacity, View } from "react-native";
import { usePermissionHandler } from "react-native-permission-handler";
import { CAMERA, Flag, styles } from "./shared";

export default function HookDemo() {
  const camera = usePermissionHandler({
    permission: CAMERA,
    prePrompt: {
      title: "Camera Access",
      message: "We need your camera to scan QR codes. We don't store any images or video.",
      confirmLabel: "Continue",
      cancelLabel: "Not Now",
    },
    blockedPrompt: {
      title: "Camera Blocked",
      message: "Camera access was denied. Please enable it in your device settings.",
      settingsLabel: "Open Settings",
    },
    onGrant: () => console.log("Camera granted!"),
    onDeny: () => console.log("Camera denied"),
    onBlock: () => console.log("Camera blocked"),
  });

  return (
    <View style={styles.demoCard}>
      <Text style={styles.demoTitle}>usePermissionHandler</Text>
      <Text style={styles.demoSubtitle}>Camera permission</Text>

      <View style={styles.statusRow}>
        <Text style={styles.label}>State:</Text>
        <Text style={styles.value}>{camera.state}</Text>
      </View>
      <View style={styles.statusRow}>
        <Text style={styles.label}>Native status:</Text>
        <Text style={styles.value}>{camera.nativeStatus ?? "null"}</Text>
      </View>

      <View style={styles.flags}>
        <Flag label="granted" active={camera.isGranted} />
        <Flag label="denied" active={camera.isDenied} />
        <Flag label="blocked" active={camera.isBlocked} />
        <Flag label="checking" active={camera.isChecking} />
        <Flag label="unavailable" active={camera.isUnavailable} />
      </View>

      {camera.state === "prePrompt" && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryBtn} onPress={camera.request}>
            <Text style={styles.primaryBtnText}>Continue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={camera.dismiss}>
            <Text style={styles.secondaryBtnText}>Not Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {camera.state === "blockedPrompt" && (
        <TouchableOpacity style={styles.primaryBtn} onPress={camera.openSettings}>
          <Text style={styles.primaryBtnText}>Open Settings</Text>
        </TouchableOpacity>
      )}

      {(camera.state === "idle" || camera.isDenied) && (
        <TouchableOpacity style={styles.outlineBtn} onPress={camera.check}>
          <Text style={styles.outlineBtnText}>Re-check</Text>
        </TouchableOpacity>
      )}

      {camera.isGranted && (
        <View style={styles.grantedBox}>
          <Text style={styles.grantedText}>Camera ready — you'd show the camera here.</Text>
        </View>
      )}
    </View>
  );
}
