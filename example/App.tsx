import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { PERMISSIONS } from "react-native-permissions";
import {
  PermissionGate,
  useMultiplePermissions,
  usePermissionHandler,
} from "react-native-permission-handler";

type Demo = "hook" | "gate" | "multi" | null;

const CAMERA = Platform.select({
  ios: PERMISSIONS.IOS.CAMERA,
  android: PERMISSIONS.ANDROID.CAMERA,
})!;

const MICROPHONE = Platform.select({
  ios: PERMISSIONS.IOS.MICROPHONE,
  android: PERMISSIONS.ANDROID.RECORD_AUDIO,
})!;

// Demo 1: Hook-based camera permission
function HookDemo() {
  const camera = usePermissionHandler({
    permission: CAMERA,
    prePrompt: {
      title: "Camera Access",
      message:
        "We need your camera to scan QR codes. We don't store any images or video.",
      confirmLabel: "Continue",
      cancelLabel: "Not Now",
    },
    blockedPrompt: {
      title: "Camera Blocked",
      message:
        "Camera access was denied. Please enable it in your device settings.",
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

// Demo 2: PermissionGate component
function GateDemo() {
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
        }}
        fallback={
          <Text style={styles.fallback}>Checking permission...</Text>
        }
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

// Demo 3: Multiple permissions (camera + microphone)
function MultiDemo() {
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
          <Text style={styles.value}>{status}</Text>
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

function Flag({ label, active }: { label: string; active: boolean }) {
  return (
    <View style={[styles.flag, active && styles.flagActive]}>
      <Text style={[styles.flagText, active && styles.flagTextActive]}>{label}</Text>
    </View>
  );
}

export default function App() {
  const [demo, setDemo] = useState<Demo>(null);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>react-native-permission-handler</Text>
        <Text style={styles.subtitle}>Example App</Text>

        {demo === null && (
          <View style={styles.menu}>
            <TouchableOpacity style={styles.menuBtn} onPress={() => setDemo("hook")}>
              <Text style={styles.menuBtnTitle}>usePermissionHandler</Text>
              <Text style={styles.menuBtnDesc}>Hook with full control over UI</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuBtn} onPress={() => setDemo("gate")}>
              <Text style={styles.menuBtnTitle}>{"<PermissionGate>"}</Text>
              <Text style={styles.menuBtnDesc}>Declarative component wrapper</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuBtn} onPress={() => setDemo("multi")}>
              <Text style={styles.menuBtnTitle}>useMultiplePermissions</Text>
              <Text style={styles.menuBtnDesc}>Camera + Mic (sequential)</Text>
            </TouchableOpacity>
          </View>
        )}

        {demo !== null && (
          <>
            <TouchableOpacity style={styles.backBtn} onPress={() => setDemo(null)}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>

            {demo === "hook" && <HookDemo />}
            {demo === "gate" && <GateDemo />}
            {demo === "multi" && <MultiDemo />}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scroll: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: "#888",
    textAlign: "center",
    marginBottom: 28,
  },
  menu: {
    gap: 12,
  },
  menuBtn: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  menuBtnTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 4,
  },
  menuBtnDesc: {
    fontSize: 13,
    color: "#888",
  },
  backBtn: {
    marginBottom: 16,
  },
  backBtnText: {
    fontSize: 16,
    color: "#007AFF",
  },
  demoCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  demoTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 2,
  },
  demoSubtitle: {
    fontSize: 13,
    color: "#888",
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  label: {
    fontSize: 14,
    color: "#555",
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  granted: {
    color: "#34C759",
  },
  flags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
    marginBottom: 16,
  },
  flag: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  flagActive: {
    backgroundColor: "#007AFF",
  },
  flagText: {
    fontSize: 12,
    color: "#888",
  },
  flagTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  actions: {
    gap: 8,
  },
  primaryBtn: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  secondaryBtnText: {
    color: "#007AFF",
    fontSize: 15,
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  outlineBtnText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  grantedBox: {
    backgroundColor: "#E8F9EE",
    borderRadius: 10,
    padding: 16,
    marginTop: 12,
  },
  grantedText: {
    color: "#1B7A3D",
    fontSize: 14,
    textAlign: "center",
  },
  fallback: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    padding: 20,
  },
});
