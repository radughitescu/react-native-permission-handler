import { StyleSheet, Text, View } from "react-native";
import { Permissions } from "react-native-permission-handler/rnp";

export const CAMERA = Permissions.CAMERA;
export const MICROPHONE = Permissions.MICROPHONE;

export function Flag({ label, active }: { label: string; active: boolean }) {
  return (
    <View style={[styles.flag, active && styles.flagActive]}>
      <Text style={[styles.flagText, active && styles.flagTextActive]}>{label}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  demoCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  demoTitle: { fontSize: 18, fontWeight: "700", marginBottom: 2 },
  demoSubtitle: { fontSize: 13, color: "#888", marginBottom: 16 },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  label: { fontSize: 14, color: "#555" },
  value: { fontSize: 14, fontWeight: "600", color: "#333" },
  granted: { color: "#34C759" },
  flags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12, marginBottom: 16 },
  flag: { backgroundColor: "#f0f0f0", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  flagActive: { backgroundColor: "#007AFF" },
  flagText: { fontSize: 12, color: "#888" },
  flagTextActive: { color: "#fff", fontWeight: "600" },
  actions: { gap: 8 },
  primaryBtn: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryBtn: { alignItems: "center", paddingVertical: 10 },
  secondaryBtnText: { color: "#007AFF", fontSize: 15 },
  outlineBtn: {
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  outlineBtnText: { color: "#007AFF", fontSize: 16, fontWeight: "600" },
  grantedBox: { backgroundColor: "#E8F9EE", borderRadius: 10, padding: 16, marginTop: 12 },
  grantedText: { color: "#1B7A3D", fontSize: 14, textAlign: "center" },
  limitedBox: { backgroundColor: "#FFF8E1", borderRadius: 10, padding: 16, marginTop: 12 },
  limitedText: { color: "#8D6E00", fontSize: 14, textAlign: "center" },
  activePrompt: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 16,
    marginTop: 12,
  },
  activePromptTitle: { fontSize: 15, fontWeight: "600", marginBottom: 8, textAlign: "center" },
  fallback: { fontSize: 14, color: "#999", textAlign: "center", padding: 20 },
});
