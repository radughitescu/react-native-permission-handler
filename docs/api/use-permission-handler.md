# `usePermissionHandler`

The primary hook. Owns the full permission lifecycle for a single permission: initial check,
pre-prompt, system dialog, blocked recovery, settings redirect, and foreground re-check after
Settings return.

```tsx
import { usePermissionHandler } from "react-native-permission-handler";
import { Permissions } from "react-native-permission-handler/rnp";
```

## Signature

```ts
function usePermissionHandler(config: PermissionHandlerConfig): PermissionHandlerResult;
```

## `PermissionHandlerConfig`

| Field | Type | Description |
|-------|------|-------------|
| `permission` | `string` | Engine-specific permission identifier. Use `Permissions.*` for the RNP engine or a plain key like `"camera"` for Expo. |
| `engine` | `PermissionEngine` | Optional. Overrides the global default and RNP fallback for this hook only. |
| `prePrompt` | `PrePromptConfig` | Optional since v0.7.0. Title/message for the default pre-prompt modal. Omit when you render your own UI from `state === "prePrompt"`. |
| `blockedPrompt` | `BlockedPromptConfig` | Optional since v0.7.0. Title/message for the default blocked modal. Omit when rendering your own. |
| `autoCheck` | `boolean` | Default `true`. When `false`, nothing happens until you call `check()`. |
| `recheckOnForeground` | `boolean` | Default `false`. When `true`, re-checks the permission on every `background → active` AppState transition, not only after `openSettings()`. Useful when users may toggle permissions in system Settings without going through your blocked-prompt flow. The Settings-return recheck still takes precedence when it applies. |
| `requestTimeout` | `number` | Request timeout in ms. On Android 16 (API 36+) a 5 s default is applied automatically — set an explicit value to override. |
| `onTimeout` | `() => void` | Fires when the request hits `requestTimeout`. The hook transitions to `blockedPrompt`. |
| `skipPrePrompt` | `boolean \| "android"` | Skip the pre-prompt and jump straight from `checking` to `requesting` on denied status. `"android"` is the safe choice — Android allows two dialog attempts; iOS is one-shot. See [voice-note recipe](../recipes/voice-note-composer.md). |
| `debug` | `boolean \| (msg: string) => void` | `true` logs state transitions to `console.log`. Pass a function to route logs to your own logger (Sentry, Logger, etc.). |
| `onGrant` | `() => void` | Fires on transitions into `granted` **or** `limited`. `isGranted` is also `true` for both. |
| `onDeny` | `() => void` | Fires on pre-prompt dismiss, blocked-prompt dismiss, or denied system dialog. |
| `onBlock` | `() => void` | Fires when the system dialog returns `blocked`. |
| `onSettingsReturn` | `(granted: boolean) => void` | Fires after the app returns from Settings and re-checks. `granted` is `true` for both `granted` and `limited`. |

## `PermissionHandlerResult`

| Field | Type | Description |
|-------|------|-------------|
| `state` | `PermissionFlowState` | The current state machine state. See [types.md](./types.md) for the full list. |
| `nativeStatus` | `PermissionStatus \| null` | The raw status from the last engine call. |
| `isGranted` | `boolean` | `true` for `granted` **and** `limited` states (backward compatible). |
| `isLimited` | `boolean` | `true` only for the `limited` state — use this to detect iOS 14+ partial photo access. |
| `isDenied` | `boolean` | `true` for the `denied` state. |
| `isBlocked` | `boolean` | `true` for `blocked`, `blockedPrompt`, or `openingSettings`. |
| `isChecking` | `boolean` | `true` for `checking` or `recheckingAfterSettings`. |
| `isUnavailable` | `boolean` | Terminal state — device doesn't support this feature. |
| `request()` | `() => void` | Confirm the pre-prompt and fire the system dialog. |
| `check()` | `() => void` | Manually re-check status through the engine. |
| `dismiss()` | `() => void` | Dismiss the pre-prompt ("Not Now"). |
| `dismissBlocked()` | `() => void` | Dismiss the blocked prompt — useful for non-critical permissions. |
| `openSettings()` | `() => void` | Open the app settings screen. The hook will re-check automatically on return. |
| `reset()` | `() => void` | Reset to `idle`. Cancels any in-flight work via a generation counter. |
| `requestFullAccess()` | `() => Promise<PermissionStatus>` | Upgrade from `limited` to `granted` via `engine.requestFullAccess()`. **Only supported on the Expo engine today** (via `MediaLibrary.presentPermissionsPickerAsync`). The RNP engine throws because `react-native-permissions` does not expose a JS binding for iOS `presentLimitedLibraryPicker` yet — tracked as future work. See [limited-photo recipe](../recipes/limited-photo-upgrade.md). |
| `refresh()` | `() => Promise<PermissionStatus>` | Force a fresh `engine.request()` bypassing `check()`. Use when the native status reports `granted` but the permission is functionally broken (e.g. iOS 18 camera/photo corrupted-grant after a system update). From terminal states (`granted`, `limited`, `denied`, `blocked`, `unavailable`) transitions to `requesting` and re-runs the native dialog. From non-terminal states it's a no-op that returns the current native status unchanged. |

## Minimal example

```tsx
import { usePermissionHandler } from "react-native-permission-handler";
import { Permissions } from "react-native-permission-handler/rnp";

export function QRScannerScreen() {
  const camera = usePermissionHandler({
    permission: Permissions.CAMERA,
    prePrompt: { title: "Camera access", message: "We need your camera to scan QR codes." },
    blockedPrompt: { title: "Camera blocked", message: "Enable camera in Settings to continue." },
    onGrant: () => analytics.track("camera_granted"),
  });

  if (camera.isChecking) return <Spinner />;
  if (camera.isGranted) return <Scanner />;
  if (camera.isUnavailable) return <Text>Camera not available on this device.</Text>;
  return null; // default pre-prompt / blocked-prompt modals render on top
}
```

## Custom UI (no default modals)

When you render your own prompts, omit `prePrompt` and `blockedPrompt` and branch on `state`:

```tsx
const mic = usePermissionHandler({ permission: Permissions.MICROPHONE });

if (mic.state === "prePrompt") {
  return <MyPrePrompt onAllow={mic.request} onSkip={mic.dismiss} />;
}
if (mic.state === "blockedPrompt") {
  return <MyBlockedPrompt onSettings={mic.openSettings} onDismiss={mic.dismissBlocked} />;
}
```

## Manual flow with `autoCheck: false`

Useful for "press a button to request" composer flows:

```tsx
const location = usePermissionHandler({
  permission: Permissions.LOCATION_WHEN_IN_USE,
  autoCheck: false,
});

<Button title="Share location" onPress={location.check} />;
```

## Notes

- `onGrant` fires for both `granted` and `limited`. If you care about the distinction, check
  `isLimited` inside the callback or branch on `state`.
- The hook uses an internal generation counter, so `reset()` is always safe to call during
  in-flight requests.
- For the upgrade-from-limited flow, see [limited-photo-upgrade.md](../recipes/limited-photo-upgrade.md).
