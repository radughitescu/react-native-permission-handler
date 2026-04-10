import { StatusBar } from "expo-status-bar";
import React, { Suspense, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Demo = "hook" | "gate" | "multi" | null;

// Lazy-load demo components so react-native-permissions is NOT imported
// at bundle evaluation time. This avoids TurboModuleRegistry.getEnforcing
// being called before the runtime is ready in the Expo dev client.
const HookDemo = React.lazy(() => import("./demos/HookDemo"));
const GateDemo = React.lazy(() => import("./demos/GateDemo"));
const MultiDemo = React.lazy(() => import("./demos/MultiDemo"));

function Loading() {
  return (
    <View style={styles.loading}>
      <Text style={styles.loadingText}>Loading...</Text>
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
              <Text style={styles.backBtnText}>{"← Back"}</Text>
            </TouchableOpacity>

            <Suspense fallback={<Loading />}>
              {demo === "hook" && <HookDemo />}
              {demo === "gate" && <GateDemo />}
              {demo === "multi" && <MultiDemo />}
            </Suspense>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
  loading: { padding: 40, alignItems: "center" },
  loadingText: { fontSize: 15, color: "#999" },
});
