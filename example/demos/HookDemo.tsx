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
      dismissLabel: "Not Now",
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
        <Flag label="limited" active={camera.isLimited} />
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
        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryBtn} onPress={camera.openSettings}>
            <Text style={styles.primaryBtnText}>Open Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={camera.dismissBlocked}>
            <Text style={styles.secondaryBtnText}>Not Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {camera.isLimited && (
        <View style={styles.limitedBox}>
          <Text style={styles.limitedText}>
            Limited access granted. You selected specific photos only.
          </Text>
        </View>
      )}

      {(camera.state === "idle" || camera.isDenied) && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.outlineBtn} onPress={camera.check}>
            <Text style={styles.outlineBtnText}>Re-check</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={camera.reset}>
            <Text style={styles.secondaryBtnText}>Reset</Text>
          </TouchableOpacity>
        </View>
      )}

      {camera.isGranted && !camera.isLimited && (
        <View style={styles.grantedBox}>
          <Text style={styles.grantedText}>Camera ready — you'd show the camera here.</Text>
        </View>
      )}
    </View>
  );
}
