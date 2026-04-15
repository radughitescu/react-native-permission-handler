import { StatusBar } from "expo-status-bar";
import React, { Suspense, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ErrorBoundary } from "./demos/ErrorBoundary";

type Demo = "hook" | "gate" | "multi" | "foreground" | "location-bundle" | null;

const HookDemo = React.lazy(() => import("./demos/HookDemo"));
const GateDemo = React.lazy(() => import("./demos/GateDemo"));
const MultiDemo = React.lazy(() => import("./demos/MultiDemo"));
const ForegroundRecheckDemo = React.lazy(() => import("./demos/ForegroundRecheckDemo"));
const LocationBundleDemo = React.lazy(() => import("./demos/LocationBundleDemo"));

export default function App() {
  const [demo, setDemo] = useState<Demo>(null);

  return (
    <SafeAreaProvider>
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

            <TouchableOpacity style={styles.menuBtn} onPress={() => setDemo("foreground")}>
              <Text style={styles.menuBtnTitle}>recheckOnForeground</Text>
              <Text style={styles.menuBtnDesc}>v0.7.0 — auto re-check on app resume</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuBtn} onPress={() => setDemo("location-bundle")}>
              <Text style={styles.menuBtnTitle}>LOCATION_BACKGROUND bundle</Text>
              <Text style={styles.menuBtnDesc}>
                v0.7.0 — platform-aware (iOS: 1 entry, Android: 2)
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {demo !== null && (
          <>
            <TouchableOpacity style={styles.backBtn} onPress={() => setDemo(null)}>
              <Text style={styles.backBtnText}>{"← Back"}</Text>
            </TouchableOpacity>

            <ErrorBoundary>
              <Suspense fallback={<Text style={styles.loading}>Loading...</Text>}>
                {demo === "hook" && <HookDemo />}
                {demo === "gate" && <GateDemo />}
                {demo === "multi" && <MultiDemo />}
                {demo === "foreground" && <ForegroundRecheckDemo />}
                {demo === "location-bundle" && <LocationBundleDemo />}
              </Suspense>
            </ErrorBoundary>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  scroll: { padding: 20, paddingTop: 60 },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 15, color: "#888", textAlign: "center", marginBottom: 28 },
  menu: { gap: 12 },
  menuBtn: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  menuBtnTitle: { fontSize: 17, fontWeight: "600", marginBottom: 4 },
  menuBtnDesc: { fontSize: 13, color: "#888" },
  backBtn: { marginBottom: 16 },
  backBtnText: { fontSize: 16, color: "#007AFF" },
  loading: { fontSize: 15, color: "#999", textAlign: "center", padding: 40 },
});
