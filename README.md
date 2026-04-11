# react-native-permission-handler

Smart permission UX flows for React Native. Pre-prompts, blocked handling, settings redirect, and foreground re-check — in one hook.

Works with [`react-native-permissions`](https://github.com/zoontek/react-native-permissions), [Expo modules](https://docs.expo.dev/guides/permissions/), or any custom permissions backend via the pluggable engine architecture.

## Why

Every React Native app that uses device features needs runtime permissions. The low-level check/request API is solved by libraries like `react-native-permissions` or Expo modules. But the **UX flow** — pre-prompts, blocked state recovery, settings redirect, foreground re-check — is not. Every team builds the same 150+ lines of boilerplate for every permission, in every project.

This library handles the full flow in a single hook call, with any permissions backend.

## Quick Start

```bash
npm install react-native-permission-handler
```

### With react-native-permissions (zero config)

If you have `react-native-permissions` installed, everything works out of the box — no engine configuration needed.

```bash
npm install react-native-permissions
```

```tsx
import { usePermissionHandler } from "react-native-permission-handler";
import { Permissions } from "react-native-permission-handler/rnp";

function QRScannerScreen() {
  const camera = usePermissionHandler({
    permission: Permissions.CAMERA,
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

### With Expo modules

```tsx
import { setDefaultEngine } from "react-native-permission-handler";
import { createExpoEngine } from "react-native-permission-handler/expo";

// Zero-config — auto-discovers all installed Expo permission modules
setDefaultEngine(createExpoEngine());
```

That's it. The engine automatically finds installed modules (`expo-camera`, `expo-location`, `expo-notifications`, etc.) and maps them to permission keys like `"camera"`, `"locationForeground"`, `"notifications"`.

To override or add custom permissions:

```tsx
setDefaultEngine(
  createExpoEngine({
    permissions: {
      // Override a discovered default
      camera: {
        get: () => Camera.getCameraPermissionsAsync(),
        request: () => Camera.requestCameraPermissionsAsync(),
      },
      // Add a custom permission
      myCustom: myModule,
    },
  })
);
```

Then use the hooks with plain string identifiers:

```tsx
const camera = usePermissionHandler({
  permission: "camera",
  prePrompt: { title: "Camera", message: "We need camera access." },
  blockedPrompt: { title: "Blocked", message: "Enable in Settings." },
});
```

### With a custom engine

Implement the `PermissionEngine` interface to use any permissions backend:

```tsx
import type { PermissionEngine } from "react-native-permission-handler";

const myEngine: PermissionEngine = {
  check: async (permission) => { /* return "granted" | "denied" | "blocked" | "limited" | "unavailable" */ },
  request: async (permission) => { /* request and return status */ },
  openSettings: async () => { /* open app settings */ },
};

// Use globally
setDefaultEngine(myEngine);

// Or per-hook
const camera = usePermissionHandler({
  permission: "camera",
  engine: myEngine,
  // ...
});
```

## Engine Resolution

When a hook needs to call a permission API, it resolves the engine in this order:

1. **Config prop** — `engine` passed directly to the hook/component
2. **Global default** — set via `setDefaultEngine()`
3. **Auto-fallback** — lazily loads `react-native-permissions` if installed

If none of the above resolves, a clear error message explains the three options.

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
| `denied` | User dismissed the pre-prompt or denied via system dialog. Still requestable. |
| `blocked` | Permission is permanently denied. Only Settings can fix it. |
| `blockedPrompt` | Showing the "go to Settings" prompt. |
| `openingSettings` | User tapped "Open Settings". Waiting for return. |
| `recheckingAfterSettings` | App returned from Settings. Re-checking status. |
| `unavailable` | Device doesn't support this feature. Terminal state. |

## API Reference

### `usePermissionHandler(config)`

The main hook. Manages the full permission lifecycle.

**Config:**

```typescript
{
  permission: string;                // permission identifier (engine-specific)
  engine?: PermissionEngine;         // optional — overrides global/fallback

  prePrompt: {
    title: string;
    message: string;
    confirmLabel?: string;           // default: "Continue"
    cancelLabel?: string;            // default: "Not Now"
  };

  blockedPrompt: {
    title: string;
    message: string;
    settingsLabel?: string;          // default: "Open Settings"
  };

  // Callbacks
  onGrant?: () => void;
  onDeny?: () => void;
  onBlock?: () => void;
  onSettingsReturn?: (granted: boolean) => void;

  // Options
  autoCheck?: boolean;               // default: true — check on mount
  recheckOnForeground?: boolean;     // default: false
  requestTimeout?: number;           // timeout for request() in ms (opt-in)
  onTimeout?: () => void;            // called if request() times out
  debug?: boolean | ((msg: string) => void); // log state transitions
}
```

**Returns:**

```typescript
{
  state: PermissionFlowState;           // current state machine state
  nativeStatus: PermissionStatus | null; // status from the engine

  // Convenience booleans
  isGranted: boolean;
  isDenied: boolean;
  isBlocked: boolean;
  isChecking: boolean;
  isUnavailable: boolean;

  // Actions
  request: () => void;      // confirm pre-prompt -> fire system dialog
  check: () => void;        // manually re-check permission status
  dismiss: () => void;      // dismiss pre-prompt ("Not Now")
  openSettings: () => void; // open app settings for blocked permissions
}
```

**Example — full control over UI:**

```tsx
function CameraScreen() {
  const camera = usePermissionHandler({
    permission: Permissions.CAMERA,
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
    permission: string;
    prePrompt: PrePromptConfig;
    blockedPrompt: BlockedPromptConfig;
    onGrant?: () => void;
    onDeny?: () => void;
    onBlock?: () => void;
  }>;

  strategy: "sequential" | "parallel";
  // sequential: ask one at a time, stop on denial/block
  // parallel: check all at once, then request denied ones

  engine?: PermissionEngine;  // optional — overrides global/fallback
  autoCheck?: boolean;        // default: true — check all on mount
  requestTimeout?: number;    // timeout for request() in ms (opt-in)
  onTimeout?: () => void;     // called if any request() times out
  debug?: boolean | ((msg: string) => void); // log state transitions
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
        permission: Permissions.CAMERA,
        prePrompt: { title: "Camera", message: "Needed for video." },
        blockedPrompt: { title: "Camera Blocked", message: "Enable in Settings." },
      },
      {
        permission: Permissions.MICROPHONE,
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
  permission: string;
  engine?: PermissionEngine;
  prePrompt: PrePromptConfig;
  blockedPrompt: BlockedPromptConfig;
  children: ReactNode;                    // shown when granted
  fallback?: ReactNode;                   // shown while checking
  onGrant?: () => void;
  onDeny?: () => void;
  onBlock?: () => void;
  onSettingsReturn?: (granted: boolean) => void;

  // Custom UI (optional -- default modals are used if omitted)
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
  permission={Permissions.CAMERA}
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
// -> "requesting"
```

Pure function, no side effects, no React dependency.

---

### `setDefaultEngine(engine)`

Set a global default `PermissionEngine` for all hooks and components. Call once at app startup.

```typescript
import { setDefaultEngine } from "react-native-permission-handler";

setDefaultEngine(myEngine);
```

---

### `createRNPEngine()`

Create an engine adapter for `react-native-permissions`. Handles notification routing internally.

```typescript
import { createRNPEngine } from "react-native-permission-handler/rnp";

const engine = createRNPEngine();
setDefaultEngine(engine);
```

You don't need to call this explicitly if `react-native-permissions` is installed — the library auto-creates it as a fallback.

---

### `Permissions`

The RNP entry point exports permission constants. Cross-platform permissions resolve to the correct platform string at runtime via `Platform.select`:

```typescript
import { Permissions } from "react-native-permission-handler/rnp";

// Cross-platform (resolve per platform)
Permissions.CAMERA              // ios: "ios.permission.CAMERA", android: "android.permission.CAMERA"
Permissions.MICROPHONE          // ios: "ios.permission.MICROPHONE", android: "android.permission.RECORD_AUDIO"
Permissions.CONTACTS
Permissions.CALENDARS
Permissions.CALENDARS_WRITE_ONLY
Permissions.LOCATION_WHEN_IN_USE
Permissions.LOCATION_ALWAYS
Permissions.PHOTO_LIBRARY
Permissions.PHOTO_LIBRARY_ADD_ONLY
Permissions.MEDIA_LIBRARY
Permissions.BLUETOOTH
Permissions.SPEECH_RECOGNITION
Permissions.MOTION
Permissions.NOTIFICATIONS       // "notifications" (routed to notification-specific APIs)

// iOS-only
Permissions.IOS.APP_TRACKING_TRANSPARENCY
Permissions.IOS.FACE_ID
Permissions.IOS.REMINDERS
Permissions.IOS.SIRI
Permissions.IOS.STOREKIT

// Android-only
Permissions.ANDROID.BODY_SENSORS
Permissions.ANDROID.CALL_PHONE
Permissions.ANDROID.READ_SMS
Permissions.ANDROID.BLUETOOTH_SCAN
Permissions.ANDROID.BLUETOOTH_ADVERTISE
// ... and 26 more (full list in source)
```

---

### `createExpoEngine(config?)`

Create an engine adapter for Expo permission modules. With no arguments, auto-discovers all installed Expo modules. User config merges on top of discovered defaults.

Each permission entry can be either:
- A module with standard `getPermissionsAsync`/`requestPermissionsAsync` methods
- An explicit `{ get, request }` pair for modules with non-standard method names

**Auto-discovered permission keys:** `camera`, `microphone`, `locationForeground`, `locationBackground`, `notifications`, `contacts`, `calendar`, `reminders`, `mediaLibrary`, `imagePickerCamera`, `imagePickerMediaLibrary`, `tracking`, `brightness`, `audioRecording`, `audio`, `screenCapture`, `cellular`, `pedometer`, `accelerometer`

```typescript
import { createExpoEngine } from "react-native-permission-handler/expo";
import * as Camera from "expo-camera";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as Contacts from "expo-contacts";

const engine = createExpoEngine({
  permissions: {
    // Standard modules — pass directly
    notifications: Notifications,
    contacts: Contacts,

    // Non-standard method names — use { get, request }
    camera: {
      get: () => Camera.getCameraPermissionsAsync(),
      request: () => Camera.requestCameraPermissionsAsync(),
    },
    microphone: {
      get: () => Camera.getMicrophonePermissionsAsync(),
      request: () => Camera.requestMicrophonePermissionsAsync(),
    },
    locationForeground: {
      get: () => Location.getForegroundPermissionsAsync(),
      request: () => Location.requestForegroundPermissionsAsync(),
    },
    locationBackground: {
      get: () => Location.getBackgroundPermissionsAsync(),
      request: () => Location.requestBackgroundPermissionsAsync(),
    },
  },
});
```

The adapter maps Expo's `{ status, canAskAgain }` response to the library's `PermissionStatus`:

| Expo status | `canAskAgain` | Maps to |
|---|---|---|
| `"granted"` | — | `"granted"` |
| `"undetermined"` | — | `"denied"` |
| `"denied"` | `true` | `"denied"` |
| `"denied"` | `false` | `"blocked"` |

---

### `PermissionEngine` interface

Implement this to use any permissions backend:

```typescript
interface PermissionEngine {
  check(permission: string): Promise<PermissionStatus>;
  request(permission: string): Promise<PermissionStatus>;
  openSettings(): Promise<void>;
}

type PermissionStatus = "granted" | "denied" | "blocked" | "limited" | "unavailable";
```

The engine is responsible for:
- Mapping its native status values to the library's `PermissionStatus`
- Handling special cases like notifications internally
- Opening the correct settings screen

## Debugging & Reliability

### Request Timeout

On Android 16, `request()` can hang indefinitely when a permission is in `never_ask_again` state ([facebook/react-native#53887](https://github.com/facebook/react-native/issues/53887)). Enable `requestTimeout` to recover:

```tsx
const camera = usePermissionHandler({
  permission: Permissions.CAMERA,
  requestTimeout: 15000, // 15 seconds
  onTimeout: () => console.warn("Permission request timed out"),
  prePrompt: { title: "Camera", message: "..." },
  blockedPrompt: { title: "Blocked", message: "..." },
});
```

On timeout, the hook transitions to `blockedPrompt` (since the hanging bug only occurs for already-blocked permissions) and fires `onTimeout`.

### Debug Logging

Enable `debug` to log state transitions — useful for bug reports and support workflows:

```tsx
const camera = usePermissionHandler({
  permission: Permissions.CAMERA,
  debug: true,
  // ...
});
// Console: [permission-handler] camera: idle → checking (CHECK)
// Console: [permission-handler] camera: checking → prePrompt (CHECK_RESULT:denied)
```

Pass a function to route logs to your own logger:

```tsx
debug: (msg) => Sentry.addBreadcrumb({ message: msg, category: "permissions" })
```

## Platform Notes

**iOS:**
- The system permission dialog can only be shown **once** per permission. If the user denies it, you can never show it again programmatically. This is why the pre-prompt is critical.
- `check()` returns `DENIED` for both "never asked" and "denied once" — both are still requestable.
- `BLOCKED` means the user denied via the system dialog or disabled the permission in Settings.

**Android:**
- After 2 denials, Android 11+ auto-blocks the permission. No more system dialogs.
- For notification permissions on Android 13+, `checkNotifications()` never returns `BLOCKED` — the RNP engine handles this by using `requestNotifications()` for accurate status.

**Notifications:**
- Pass `"notifications"` as the permission identifier. The RNP engine automatically routes to `checkNotifications`/`requestNotifications`. For Expo, map `"notifications"` to `expo-notifications` in the engine config.

## Requirements

- React Native >= 0.76
- React >= 18
- One of:
  - `react-native-permissions` >= 4.0.0 (auto-detected, no config needed)
  - Expo permission modules (use `createExpoEngine`)
  - Custom `PermissionEngine` implementation

## License

MIT
