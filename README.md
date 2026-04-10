# react-native-permission-handler

Smart permission UX flows for React Native. Pre-prompts, blocked handling, settings redirect, and foreground re-check — in one hook.

Built on [`react-native-permissions`](https://github.com/zoontek/react-native-permissions).

## Why

Every React Native app that uses device features needs runtime permissions. The low-level check/request API is solved by `react-native-permissions`. But the **UX flow** — pre-prompts, blocked state recovery, settings redirect, foreground re-check — is not. Every team builds the same 150+ lines of boilerplate for every permission, in every project.

This library handles the full flow in a single hook call.

## Quick Start

```bash
npm install react-native-permission-handler react-native-permissions
```

Set up `react-native-permissions` for your platform ([iOS](https://github.com/zoontek/react-native-permissions#ios) / [Android](https://github.com/zoontek/react-native-permissions#android) / [Expo](https://github.com/zoontek/react-native-permissions#expo)).

Then:

```tsx
import { usePermissionHandler } from "react-native-permission-handler";
import { PERMISSIONS } from "react-native-permissions";

function QRScannerScreen() {
  const camera = usePermissionHandler({
    permission: PERMISSIONS.IOS.CAMERA,
    prePrompt: {
      title: "Camera Access",
      message: "We need your camera to scan QR codes.",
    },
    blockedPrompt: {
      title: "Camera Blocked",
      message: "Please enable camera in Settings.",
    },
  });

  if (camera.isChecking) return <LoadingSpinner />;
  if (camera.isGranted) return <QRScanner />;
  if (camera.isUnavailable) return <Text>Camera not available.</Text>;

  // Pre-prompt and blocked modals are rendered by the hook's
  // default UI. Or build your own using camera.state.
  return null;
}
```

That's it. The hook handles checking on mount, showing a pre-prompt before the system dialog, detecting blocked state, opening Settings, re-checking when the app returns, and firing callbacks.

## State Machine

The core of the library is a pure state machine that drives the entire permission flow:

```
                          +-------+
                          | idle  |
                          +---+---+
                              |
                           CHECK
                              |
                        +-----v-----+
                        | checking  |
                        +-----+-----+
                              |
              +---------------+---------------+
              |               |               |
           GRANTED         DENIED          BLOCKED
              |               |               |
        +-----v---+    +-----v-----+   +-----v-------+
        | granted |    | prePrompt |   | blockedPrompt|
        +---------+    +-----+-----+   +------+------+
                             |                 |
                    +--------+--------+   OPEN_SETTINGS
                    |                 |        |
              CONFIRM            DISMISS  +----v----------+
                    |                 |   | openingSettings|
              +-----v-----+    +-----v+  +----+----------+
              | requesting |   |denied|       |
              +-----+------+   +------+  SETTINGS_RETURN
                    |                         |
           +--------+--------+      +---------v-----------+
           |        |        |      |recheckingAfterSettings|
        GRANTED  DENIED   BLOCKED   +---------+-----------+
           |        |        |                |
     +-----v-+ +---v--+ +---v--------+   +---+---+
     |granted| |denied| |blockedPrompt|   |granted| or back
     +-------+ +------+ +------------+   +-------+ to blockedPrompt
```

**States:**

| State | Description |
|-------|-------------|
| `idle` | Initial state. Nothing has happened yet. |
| `checking` | Permission status is being checked. |
| `prePrompt` | Permission is requestable. Show a friendly explanation before the system dialog. |
| `requesting` | System permission dialog is showing. |
| `granted` | Permission is granted. Show the protected content. |
| `denied` | User dismissed the pre-prompt ("Not Now") or denied via system dialog. Permission is still requestable next time. |
| `blocked` | Permission is permanently denied. Only Settings can fix it. |
| `blockedPrompt` | Showing the "go to Settings" prompt. |
| `openingSettings` | User tapped "Open Settings". Waiting for app to return to foreground. |
| `recheckingAfterSettings` | App returned from Settings. Re-checking permission status. |
| `unavailable` | Device doesn't support this feature. Terminal state. |

## API Reference

### `usePermissionHandler(config)`

The main hook. Manages the full permission lifecycle.

**Config:**

```typescript
{
  // The permission to manage (from react-native-permissions PERMISSIONS constants)
  permission: Permission | "notifications";

  // Pre-prompt shown BEFORE the system dialog
  prePrompt: {
    title: string;
    message: string;
    confirmLabel?: string;   // default: "Continue"
    cancelLabel?: string;    // default: "Not Now"
  };

  // Prompt shown when permission is permanently blocked
  blockedPrompt: {
    title: string;
    message: string;
    settingsLabel?: string;  // default: "Open Settings"
  };

  // Callbacks for analytics
  onGrant?: () => void;
  onDeny?: () => void;
  onBlock?: () => void;
  onSettingsReturn?: (granted: boolean) => void;

  // Options
  autoCheck?: boolean;            // default: true — check on mount
  recheckOnForeground?: boolean;  // default: false
}
```

**Returns:**

```typescript
{
  state: PermissionFlowState;           // current state machine state
  nativeStatus: PermissionStatus | null; // raw status from react-native-permissions

  // Convenience booleans
  isGranted: boolean;
  isDenied: boolean;
  isBlocked: boolean;
  isChecking: boolean;
  isUnavailable: boolean;

  // Actions
  request: () => void;      // confirm pre-prompt → fire system dialog
  check: () => void;        // manually re-check permission status
  dismiss: () => void;      // dismiss pre-prompt ("Not Now")
  openSettings: () => void; // open app settings for blocked permissions
}
```

**Example — full control over UI:**

```tsx
function CameraScreen() {
  const camera = usePermissionHandler({
    permission: PERMISSIONS.IOS.CAMERA,
    prePrompt: {
      title: "Camera Access",
      message: "We need your camera to scan QR codes.",
    },
    blockedPrompt: {
      title: "Camera Blocked",
      message: "Please enable camera in Settings.",
    },
    onGrant: () => analytics.track("camera_granted"),
    onDeny: () => analytics.track("camera_denied"),
  });

  if (camera.isGranted) return <CameraView />;

  if (camera.state === "prePrompt") {
    return (
      <MyCustomModal>
        <Text>We need camera access</Text>
        <Button title="Allow" onPress={camera.request} />
        <Button title="Not Now" onPress={camera.dismiss} />
      </MyCustomModal>
    );
  }

  if (camera.state === "blockedPrompt") {
    return (
      <MyCustomModal>
        <Text>Camera is blocked</Text>
        <Button title="Open Settings" onPress={camera.openSettings} />
      </MyCustomModal>
    );
  }

  return <LoadingSpinner />;
}
```

---

### `useMultiplePermissions(config)`

Orchestrates flows for features needing multiple permissions (e.g., video call = camera + microphone).

**Config:**

```typescript
{
  permissions: Array<{
    permission: Permission | "notifications";
    prePrompt: PrePromptConfig;
    blockedPrompt: BlockedPromptConfig;
    onGrant?: () => void;
    onDeny?: () => void;
    onBlock?: () => void;
  }>;

  strategy: "sequential" | "parallel";
  // sequential: ask one at a time, stop on denial/block
  // parallel: check all at once, then request denied ones

  onAllGranted?: () => void;
}
```

**Returns:**

```typescript
{
  statuses: Record<string, PermissionFlowState>; // keyed by permission identifier
  allGranted: boolean;
  request: () => void; // start the multi-permission flow
}
```

**Example:**

```tsx
function VideoCallScreen() {
  const perms = useMultiplePermissions({
    permissions: [
      {
        permission: PERMISSIONS.IOS.CAMERA,
        prePrompt: { title: "Camera", message: "Needed for video." },
        blockedPrompt: { title: "Camera Blocked", message: "Enable in Settings." },
      },
      {
        permission: PERMISSIONS.IOS.MICROPHONE,
        prePrompt: { title: "Microphone", message: "Needed for audio." },
        blockedPrompt: { title: "Mic Blocked", message: "Enable in Settings." },
      },
    ],
    strategy: "sequential",
    onAllGranted: () => startCall(),
  });

  if (perms.allGranted) return <VideoCallUI />;

  return <Button title="Start Call" onPress={perms.request} />;
}
```

---

### `<PermissionGate>`

Declarative component that renders children only when permission is granted.

**Props:**

```typescript
{
  permission: Permission | "notifications";
  prePrompt: PrePromptConfig;
  blockedPrompt: BlockedPromptConfig;
  children: ReactNode;                    // shown when granted
  fallback?: ReactNode;                   // shown while checking
  onGrant?: () => void;
  onDeny?: () => void;
  onBlock?: () => void;
  onSettingsReturn?: (granted: boolean) => void;

  // Custom UI (optional — default modals are used if omitted)
  renderPrePrompt?: (props: {
    config: PrePromptConfig;
    onConfirm: () => void;
    onCancel: () => void;
  }) => ReactNode;
  renderBlockedPrompt?: (props: {
    config: BlockedPromptConfig;
    onOpenSettings: () => void;
  }) => ReactNode;
}
```

**Example:**

```tsx
<PermissionGate
  permission={PERMISSIONS.IOS.CAMERA}
  prePrompt={{ title: "Camera", message: "We need camera access." }}
  blockedPrompt={{ title: "Blocked", message: "Enable in Settings." }}
  fallback={<LoadingSpinner />}
>
  <CameraView />
</PermissionGate>
```

---

### `<DefaultPrePrompt>` / `<DefaultBlockedPrompt>`

The default modal components used by `usePermissionHandler` and `PermissionGate`. You can import and use them directly if you want the default look with custom behavior.

```tsx
import { DefaultPrePrompt, DefaultBlockedPrompt } from "react-native-permission-handler";

<DefaultPrePrompt
  visible={showPrePrompt}
  title="Camera Access"
  message="We need your camera."
  confirmLabel="Allow"
  cancelLabel="Not Now"
  onConfirm={handleConfirm}
  onCancel={handleCancel}
/>

<DefaultBlockedPrompt
  visible={showBlocked}
  title="Camera Blocked"
  message="Please enable in Settings."
  settingsLabel="Open Settings"
  onOpenSettings={handleOpenSettings}
/>
```

These use only React Native primitives (`Modal`, `View`, `Text`, `TouchableOpacity`) — no third-party UI dependencies.

---

### `transition(state, event)`

The raw state machine function. For advanced use cases where you want to build your own hook or integrate with a state management library.

```typescript
import { transition } from "react-native-permission-handler";

const next = transition("prePrompt", { type: "PRE_PROMPT_CONFIRM" });
// → "requesting"
```

Pure function, no side effects, no React dependency.

## Platform Notes

**iOS:**
- The system permission dialog can only be shown **once** per permission. If the user denies it, you can never show it again programmatically. This is why the pre-prompt is critical — it preserves the one-time system dialog.
- `check()` returns `DENIED` for both "never asked" and "denied once" — both are still requestable.
- `BLOCKED` means the user denied via the system dialog or disabled the permission in Settings.

**Android:**
- After 2 denials, Android 11+ auto-blocks the permission. No more system dialogs.
- For notification permissions on Android 13+, `checkNotifications()` never returns `BLOCKED` — the library handles this by using `requestNotifications()` for accurate status.

**Notifications:**
- Pass `"notifications"` as the permission identifier. The library automatically routes to `checkNotifications`/`requestNotifications` instead of `check`/`request`.

## Requirements

- React Native >= 0.76
- React >= 18
- `react-native-permissions` >= 4.0.0

**Expo:** Add the config plugin to your `app.json`:

```json
{
  "plugins": [
    [
      "react-native-permissions",
      {
        "iosPermissions": ["Camera", "Microphone", "LocationWhenInUse"]
      }
    ]
  ]
}
```

**Bare React Native:** Follow the [react-native-permissions setup guide](https://github.com/zoontek/react-native-permissions#setup).

## License

MIT
