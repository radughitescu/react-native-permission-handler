# Types, flow states, and `Permissions`

## `PermissionStatus`

The unified permission status owned by this library. Engines must map their native statuses to
these values.

```ts
type PermissionStatus = "granted" | "denied" | "blocked" | "limited" | "unavailable";
```

| Value | Meaning |
|-------|---------|
| `granted` | Permission is fully granted. Show the protected content. |
| `limited` | iOS 14+ partial grant (photo library "Selected Photos"). Feature works, but upgrade flow is available via `requestFullAccess()`. |
| `denied` | Not granted but still requestable — system dialog can still be shown. |
| `blocked` | Permanently denied. Only Settings can fix it. |
| `unavailable` | The device doesn't support this feature. Terminal state. |

## `PermissionFlowState`

The 12 states of the state machine driving every hook.

```ts
type PermissionFlowState =
  | "idle"
  | "checking"
  | "prePrompt"
  | "requesting"
  | "granted"
  | "limited"
  | "denied"
  | "blocked"
  | "blockedPrompt"
  | "openingSettings"
  | "recheckingAfterSettings"
  | "unavailable";
```

| State | Description |
|-------|-------------|
| `idle` | Initial state. No check has happened yet. |
| `checking` | `engine.check()` is in flight. |
| `prePrompt` | Requestable. Show a friendly explanation before the system dialog. |
| `requesting` | System permission dialog is visible. |
| `granted` | Permission fully granted. |
| `limited` | Partial grant (iOS 14+ photo library). |
| `denied` | User dismissed the pre-prompt or the system dialog returned denied. Still requestable. |
| `blocked` | Terminal-until-Settings state. |
| `blockedPrompt` | Showing the "open Settings" modal. |
| `openingSettings` | User tapped "Open Settings". Waiting for the app to return. |
| `recheckingAfterSettings` | App returned from Settings. Re-checking status. |
| `unavailable` | Device doesn't support the feature. Terminal. |

## `PermissionFlowEvent`

The events that drive the pure state machine. Expose the raw `transition(state, event)` function
from `react-native-permission-handler` if you want to build your own hook.

```ts
type PermissionFlowEvent =
  | { type: "CHECK" }
  | { type: "CHECK_RESULT"; status: PermissionStatus }
  | { type: "PRE_PROMPT_CONFIRM" }
  | { type: "PRE_PROMPT_DISMISS" }
  | { type: "REQUEST_RESULT"; status: PermissionStatus }
  | { type: "BLOCKED_PROMPT_DISMISS" }
  | { type: "RESET" }
  | { type: "OPEN_SETTINGS" }
  | { type: "SETTINGS_RETURN" }
  | { type: "RECHECK_RESULT"; status: PermissionStatus };
```

```ts
import { transition } from "react-native-permission-handler";

transition("prePrompt", { type: "PRE_PROMPT_CONFIRM" }); // -> "requesting"
transition("blockedPrompt", { type: "BLOCKED_PROMPT_DISMISS" }); // -> "denied"
```

`RESET` is a universal transition to `idle` from any state.

## `Permissions` constants

Imported from the RNP entry point. Cross-platform keys resolve to the correct native permission
string per platform (and per API level for scoped-storage-aware keys).

```ts
import { Permissions } from "react-native-permission-handler/rnp";
```

### Cross-platform

```
Permissions.CAMERA
Permissions.MICROPHONE
Permissions.CONTACTS
Permissions.CALENDARS
Permissions.CALENDARS_WRITE_ONLY
Permissions.LOCATION_WHEN_IN_USE
Permissions.LOCATION_ALWAYS
Permissions.PHOTO_LIBRARY           // Android 13+: READ_MEDIA_IMAGES; below: READ_EXTERNAL_STORAGE
Permissions.PHOTO_LIBRARY_ADD_ONLY
Permissions.MEDIA_LIBRARY           // Android 13+: READ_MEDIA_AUDIO
Permissions.VIDEO_LIBRARY           // Android 13+: READ_MEDIA_VIDEO
Permissions.BLUETOOTH
Permissions.SPEECH_RECOGNITION
Permissions.MOTION
Permissions.NOTIFICATIONS           // routed to checkNotifications / requestNotifications
```

### iOS-only

```
Permissions.IOS.APP_TRACKING_TRANSPARENCY
Permissions.IOS.FACE_ID
Permissions.IOS.REMINDERS
Permissions.IOS.SIRI
Permissions.IOS.STOREKIT
```

### Android-only

Includes (non-exhaustive): `BODY_SENSORS`, `CALL_PHONE`, `READ_SMS`, `SEND_SMS`, `RECEIVE_SMS`,
`BLUETOOTH_SCAN`, `BLUETOOTH_ADVERTISE`, `NEARBY_WIFI_DEVICES`, `READ_MEDIA_IMAGES`,
`READ_MEDIA_VIDEO`, `READ_MEDIA_AUDIO`, `READ_MEDIA_VISUAL_USER_SELECTED`, `UWB_RANGING`,
`ACCESS_COARSE_LOCATION`, and more.

### `Permissions.BUNDLES`

Platform-aware presets that resolve to `string[]` for features requiring multiple native
permissions. Designed to be spread into `useMultiplePermissions` entries.

| Bundle | Resolves to |
|--------|-------------|
| `BUNDLES.BLUETOOTH` | iOS: `[BLUETOOTH]`. Android 12+: `[BLUETOOTH_SCAN, BLUETOOTH_CONNECT]`. Android 11 and below: `[ACCESS_FINE_LOCATION]`. |
| `BUNDLES.LOCATION_BACKGROUND` | iOS: `[LOCATION_WHEN_IN_USE]` — iOS models Core Location as a single authorization, and upgrading to "Always" is a follow-up step on the already-granted permission rather than a separate requestable permission (tracked as future `upgradeToAlways` API). Android: `[ACCESS_FINE_LOCATION, ACCESS_BACKGROUND_LOCATION]` — foreground must be granted first. |
| `BUNDLES.CALENDARS_WRITE_ONLY` | iOS 17+: dedicated `CALENDARS_WRITE_ONLY`. Older iOS: full `CALENDARS` (since write-only is not separable). Android: `WRITE_CALENDAR`. |

```tsx
import { useMultiplePermissions } from "react-native-permission-handler";
import { Permissions } from "react-native-permission-handler/rnp";

const perms = useMultiplePermissions({
  strategy: "sequential",
  permissions: Permissions.BUNDLES.BLUETOOTH.map((permission, i) => ({
    id: `ble-${i}`,
    permission,
    prePrompt: { title: "Bluetooth", message: "We need Bluetooth to pair your device." },
    blockedPrompt: { title: "Blocked", message: "Enable Bluetooth in Settings." },
  })),
});
```

See [ble-device-pairing](../recipes/ble-device-pairing.md) and
[background-location](../recipes/background-location.md) for full recipes.
