import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { CAMERA, Flag, styles } from "./shared";

// Lazy-require to catch the TurboModule error gracefully
function usePermissionHandlerSafe(config: any) {
  try {
    const { usePermissionHandler } = require("react-native-permission-handler");
    return { handler: usePermissionHandler(config), error: null };
  } catch (e: any) {
    return {
      handler: {
        state: "error",
        nativeStatus: null,
        isGranted: false,
        isDenied: false,
        isBlocked: false,
        isChecking: false,
        isUnavailable: false,
        request: () => {},
        check: () => {},
        dismiss: () => {},
        openSettings: () => {},
      },
      error: e.message,
    };
  }
}

export default function HookDemo() {
  const [nativeAvailable, setNativeAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const rnp = require("react-native-permissions");
      // Try accessing the native module
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
        <Text style={styles.demoTitle}>usePermissionHandler</Text>
        <Text style={styles.demoSubtitle}>Checking native module availability...</Text>
      </View>
    );
  }

  if (!nativeAvailable) {
    return (
      <View style={styles.demoCard}>
        <Text style={styles.demoTitle}>usePermissionHandler</Text>
        <Text style={styles.demoSubtitle}>Native module not available</Text>
        <View style={{ backgroundColor: "#FFF3CD", borderRadius: 10, padding: 16, marginTop: 8 }}>
          <Text style={{ fontSize: 14, color: "#856404", marginBottom: 8, fontWeight: "600" }}>
            react-native-permissions TurboModule not found
          </Text>
          <Text style={{ fontSize: 13, color: "#856404", lineHeight: 20 }}>
            This is a known issue with Expo SDK 54 + RN 0.81 new architecture.
            Third-party TurboModules using RCT_EXPORT_MODULE() are not
            discoverable by Expo's runtime. The library code and state machine
            are fully functional — this is an upstream integration gap.
          </Text>
          {error && (
            <Text style={{ fontSize: 11, color: "#999", marginTop: 8, fontFamily: "Courier" }}>
              {error}
            </Text>
          )}
        </View>
      </View>
    );
  }

  // Native module is available — render the full demo
  return <HookDemoFull />;
}

function HookDemoFull() {
  const { usePermissionHandler } = require("react-native-permission-handler");
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
