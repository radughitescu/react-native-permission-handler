import { Text, TouchableOpacity, View } from "react-native";
import { usePermissionHandler } from "react-native-permission-handler";
import { CAMERA, Flag, styles } from "./shared";

/**
 * Demonstrates the v0.7.0 `recheckOnForeground` option.
 *
 * Steps to see it in action:
 *   1. Deny camera when prompted (or start with it blocked).
 *   2. Tap "Open iOS/Android Settings" from your system UI — not the blocked prompt.
 *   3. Toggle Camera access for this app.
 *   4. Return to the app. The state will update automatically on the
 *      background → active transition because `recheckOnForeground: true`.
 *
 * Contrast with `HookDemo`, which only re-checks after the library's own
 * `openSettings()` call.
 */
export default function ForegroundRecheckDemo() {
  const camera = usePermissionHandler({
    permission: CAMERA,
    recheckOnForeground: true,
    prePrompt: {
      title: "Camera Access",
      message: "We need your camera to scan QR codes.",
      confirmLabel: "Continue",
      cancelLabel: "Not Now",
    },
    blockedPrompt: {
      title: "Camera Blocked",
      message: "Toggle camera access in Settings, then come back.",
      settingsLabel: "Open Settings",
      dismissLabel: "Not Now",
    },
    debug: (msg) => console.log("[recheckOnForeground]", msg),
  });

  return (
    <View style={styles.demoCard}>
      <Text style={styles.demoTitle}>recheckOnForeground</Text>
      <Text style={styles.demoSubtitle}>
        Background → Settings → back to app and watch the state update on its own.
      </Text>

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
      </View>

      {camera.state === "prePrompt" && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryBtn} onPress={camera.request}>
            <Text style={styles.primaryBtnText}>Allow camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={camera.dismiss}>
            <Text style={styles.secondaryBtnText}>Not Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {camera.state === "blockedPrompt" && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryBtn} onPress={camera.openSettings}>
            <Text style={styles.primaryBtnText}>Open Settings (library path)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={camera.dismissBlocked}>
            <Text style={styles.secondaryBtnText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {camera.isGranted && (
        <View style={styles.grantedBox}>
          <Text style={styles.grantedText}>
            Granted. Try toggling camera access in system Settings — the state
            will flip back when you return to the app.
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.outlineBtn} onPress={camera.check}>
          <Text style={styles.outlineBtnText}>Manual re-check</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={camera.reset}>
          <Text style={styles.secondaryBtnText}>Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
