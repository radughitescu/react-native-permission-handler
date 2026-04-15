import { Platform, Text, TouchableOpacity, View } from "react-native";
import {
  type MultiPermissionEntry,
  useMultiplePermissions,
} from "react-native-permission-handler";
import { Permissions } from "react-native-permission-handler/rnp";
import { styles } from "./shared";

/**
 * Demonstrates the v0.7.0 platform-aware `Permissions.BUNDLES.LOCATION_BACKGROUND`.
 *
 * - iOS: the bundle resolves to `[LOCATION_WHEN_IN_USE]` because iOS models
 *   Core Location as a single authorization. "Always" is a follow-up upgrade
 *   step on the same permission, not a separate requestable permission.
 * - Android: resolves to `[ACCESS_FINE_LOCATION, ACCESS_BACKGROUND_LOCATION]`.
 *
 * The same source code drives both platforms — we simply iterate the bundle.
 */
const LOCATION_BUNDLE = Permissions.BUNDLES.LOCATION_BACKGROUND;

const entries: MultiPermissionEntry[] = LOCATION_BUNDLE.map((permission, index) => {
  const isBackground = index === 1;
  return isBackground
    ? {
        id: "location-background",
        permission,
        prePrompt: {
          title: "Always allow location",
          message:
            "We need background location so your run keeps recording when the screen is off.",
        },
        blockedPrompt: {
          title: "Background location blocked",
          message: "Switch location to 'Always' in Settings for background tracking.",
        },
      }
    : {
        id: "location-foreground",
        permission,
        prePrompt: {
          title: "Location while using the app",
          message: "We need your location to track your run in real time.",
        },
        blockedPrompt: {
          title: "Location blocked",
          message: "Enable location access in Settings to continue.",
        },
      };
});

export default function LocationBundleDemo() {
  const perms = useMultiplePermissions({
    strategy: "sequential",
    permissions: entries,
    onAllGranted: () => console.log("Location flow complete"),
  });

  const active = perms.activePermission;
  const activeHandler = active ? perms.handlers[active] : null;
  const activeState = activeHandler?.state;

  return (
    <View style={styles.demoCard}>
      <Text style={styles.demoTitle}>Permissions.BUNDLES.LOCATION_BACKGROUND</Text>
      <Text style={styles.demoSubtitle}>
        {Platform.OS === "ios"
          ? "iOS: single authorization — 1 entry in the bundle"
          : "Android: foreground + background — 2 entries in the bundle"}
      </Text>

      <View style={styles.statusRow}>
        <Text style={styles.label}>Bundle length:</Text>
        <Text style={styles.value}>{LOCATION_BUNDLE.length}</Text>
      </View>

      {entries.map((entry) => {
        const key = entry.id ?? entry.permission;
        const status = perms.statuses[key];
        return (
          <View key={key} style={styles.statusRow}>
            <Text style={styles.label}>{entry.id}:</Text>
            <Text
              style={[
                styles.value,
                (status === "granted" || status === "limited") && styles.granted,
                (status === "blockedPrompt" || status === "blocked") && { color: "#FF3B30" },
                active === key && { fontWeight: "800" },
              ]}
            >
              {String(status ?? "idle")}
              {active === key ? " (active)" : ""}
            </Text>
          </View>
        );
      })}

      <View style={styles.statusRow}>
        <Text style={styles.label}>All granted:</Text>
        <Text style={[styles.value, perms.allGranted && styles.granted]}>
          {perms.allGranted ? "YES" : "NO"}
        </Text>
      </View>

      {!active && !perms.allGranted && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryBtn} onPress={perms.request}>
            <Text style={styles.primaryBtnText}>Request location</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={perms.reset}>
            <Text style={styles.secondaryBtnText}>Reset</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeHandler && activeState === "prePrompt" && (
        <View style={styles.activePrompt}>
          <Text style={styles.activePromptTitle}>
            Allow {active?.replace("location-", "")}?
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={activeHandler.request}>
              <Text style={styles.primaryBtnText}>Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={activeHandler.dismiss}>
              <Text style={styles.secondaryBtnText}>Not Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {activeHandler && activeState === "blockedPrompt" && (
        <View style={styles.activePrompt}>
          <Text style={styles.activePromptTitle}>
            {active?.replace("location-", "")} is blocked
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: "#FF9500" }]}
              onPress={activeHandler.openSettings}
            >
              <Text style={styles.primaryBtnText}>Open Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={activeHandler.dismissBlocked}>
              <Text style={styles.secondaryBtnText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {perms.allGranted && (
        <View style={styles.grantedBox}>
          <Text style={styles.grantedText}>
            {Platform.OS === "ios"
              ? "Foreground location granted. To upgrade to 'Always', a native follow-up call is required (future upgradeToAlways API)."
              : "Foreground and background location granted. Tracking is ready."}
          </Text>
        </View>
      )}
    </View>
  );
}
