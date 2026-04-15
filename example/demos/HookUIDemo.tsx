import { Text, TouchableOpacity, View } from "react-native";
import { usePermissionHandler } from "react-native-permission-handler";
import { CAMERA, Flag, styles } from "./shared";

/**
 * Demonstrates the v0.8.0 hook-level render props + `handler.ui` field.
 *
 * Imperative flows (a button deep in onboarding, a KYC camera trigger, an
 * inline voice-note composer) can't always wrap in PermissionGate. In v0.7.0
 * the bare hook gave you `state` and you had to branch yourself. In v0.8.0
 * you can declare renderPrePrompt / renderBlockedPrompt on the hook config
 * and render `{handler.ui}` inline — same ergonomic pattern as
 * PermissionGate's render props but with imperative button-driven flows.
 */
export default function HookUIDemo() {
  const camera = usePermissionHandler({
    permission: CAMERA,
    prePrompt: {
      title: "Camera Access",
      message: "We need your camera to capture a profile photo.",
    },
    blockedPrompt: {
      title: "Camera Blocked",
      message: "Enable camera access in Settings to continue.",
    },
    renderPrePrompt: ({ config, onConfirm, onCancel }) => (
      <View style={styles.activePrompt}>
        <Text style={styles.activePromptTitle}>{config.title}</Text>
        <Text style={styles.demoSubtitle}>{config.message}</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryBtn} onPress={onConfirm}>
            <Text style={styles.primaryBtnText}>Allow (custom button)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={onCancel}>
            <Text style={styles.secondaryBtnText}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    renderBlockedPrompt: ({ config, onOpenSettings, onDismiss }) => (
      <View style={styles.activePrompt}>
        <Text style={styles.activePromptTitle}>{config.title}</Text>
        <Text style={styles.demoSubtitle}>{config.message}</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: "#FF9500" }]}
            onPress={onOpenSettings}
          >
            <Text style={styles.primaryBtnText}>Open Settings (custom)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={onDismiss}>
            <Text style={styles.secondaryBtnText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
  });

  return (
    <View style={styles.demoCard}>
      <Text style={styles.demoTitle}>Hook render props + handler.ui</Text>
      <Text style={styles.demoSubtitle}>
        v0.8.0 — imperative flows without PermissionGate. renderPrePrompt /
        renderBlockedPrompt on the hook config, rendered via handler.ui.
      </Text>

      <View style={styles.statusRow}>
        <Text style={styles.label}>State:</Text>
        <Text style={styles.value}>{camera.state}</Text>
      </View>
      <View style={styles.statusRow}>
        <Text style={styles.label}>ui is null:</Text>
        <Text style={styles.value}>{camera.ui === null ? "YES" : "NO"}</Text>
      </View>

      <View style={styles.flags}>
        <Flag label="granted" active={camera.isGranted} />
        <Flag label="denied" active={camera.isDenied} />
        <Flag label="blocked" active={camera.isBlocked} />
        <Flag label="checking" active={camera.isChecking} />
      </View>

      {/*
        handler.ui is the magic — it renders renderPrePrompt when state is
        prePrompt, renderBlockedPrompt when state is blockedPrompt, and null
        otherwise. No if-else branching at the call site.
      */}
      {camera.ui}

      {camera.isGranted && (
        <View style={styles.grantedBox}>
          <Text style={styles.grantedText}>
            Granted. The custom pre-prompt above was rendered by handler.ui —
            no need to branch on state manually. Tap "Reset" and try again to
            see it re-appear.
          </Text>
        </View>
      )}

      {(camera.isDenied || camera.isGranted) && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.outlineBtn} onPress={camera.reset}>
            <Text style={styles.outlineBtnText}>Reset</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
