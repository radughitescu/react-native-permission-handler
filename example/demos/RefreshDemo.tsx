import { Text, TouchableOpacity, View } from "react-native";
import { usePermissionHandler } from "react-native-permission-handler";
import { CAMERA, Flag, styles } from "./shared";

/**
 * Demonstrates the v0.8.0 `refresh()` method.
 *
 * Use case: the iOS 18 corrupted-grant bug where `check()` reports granted
 * but the camera is functionally broken. `refresh()` bypasses check() and
 * calls engine.request() directly to force native re-consent.
 *
 * Steps to see it in action:
 *   1. Grant camera access when prompted.
 *   2. Tap "Refresh permission" — the hook transitions granted → requesting
 *      → granted (or denied if you deny in the system dialog on iOS, though
 *      iOS usually skips re-prompting on an already-granted permission).
 *   3. Contrast with "Re-check" which only calls engine.check() and would
 *      not help with the corrupted-grant scenario.
 */
export default function RefreshDemo() {
  const camera = usePermissionHandler({
    permission: CAMERA,
    prePrompt: {
      title: "Camera Access",
      message: "We need your camera to scan QR codes.",
    },
    blockedPrompt: {
      title: "Camera Blocked",
      message: "Enable camera access in Settings.",
    },
    debug: (msg) => console.log("[refresh-demo]", msg),
  });

  return (
    <View style={styles.demoCard}>
      <Text style={styles.demoTitle}>refresh() primitive</Text>
      <Text style={styles.demoSubtitle}>
        v0.8.0 — force engine.request() bypassing check() for corrupted grants
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
            <Text style={styles.primaryBtnText}>Open Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={camera.dismissBlocked}>
            <Text style={styles.secondaryBtnText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {(camera.isGranted || camera.isDenied) && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={async () => {
              const next = await camera.refresh();
              console.log("[refresh-demo] refresh returned:", next);
            }}
          >
            <Text style={styles.primaryBtnText}>Refresh permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineBtn} onPress={camera.check}>
            <Text style={styles.outlineBtnText}>Re-check (compare)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={camera.reset}>
            <Text style={styles.secondaryBtnText}>Reset</Text>
          </TouchableOpacity>
        </View>
      )}

      {camera.isGranted && (
        <View style={styles.grantedBox}>
          <Text style={styles.grantedText}>
            Granted. Tap "Refresh" to force a fresh engine.request() — watch the state
            transition through "requesting". On iOS this is how you recover from a
            corrupted-grant scenario after an OS update.
          </Text>
        </View>
      )}
    </View>
  );
}
