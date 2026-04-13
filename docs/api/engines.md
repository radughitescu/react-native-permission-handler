# Engines

An engine is the pluggable adapter that this library uses to talk to the actual permissions
backend. Every hook and component reaches state through an engine — the library itself ships
zero native code.

## The `PermissionEngine` interface

```ts
interface PermissionEngine {
  check(permission: string): Promise<PermissionStatus>;
  request(permission: string): Promise<PermissionStatus>;
  openSettings(): Promise<void>;
  requestFullAccess?(permission: string): Promise<PermissionStatus>;
}

type PermissionStatus = "granted" | "denied" | "blocked" | "limited" | "unavailable";
```

An engine is responsible for:

- Mapping its backend's native status values to the library's `PermissionStatus`.
- Routing special cases like notifications to the correct API (e.g., `checkNotifications` on RNP).
- Opening the correct settings screen for the platform.
- Optionally, implementing `requestFullAccess` for the iOS 14+ photo-library upgrade flow. Hooks
  call this via `PermissionHandlerResult.requestFullAccess()` and throw a clear error if it is not
  implemented.

## Engine resolution order

When a hook or `PermissionGate` needs an engine, it resolves in this order:

1. The `engine` prop passed directly to the hook/component (highest precedence).
2. The global default set via `setDefaultEngine()`.
3. A lazy RNP fallback that loads `react-native-permissions` if it is installed (zero config).

If none of the above resolves, the hook throws an error that explains the three options.

```ts
import { setDefaultEngine } from "react-native-permission-handler";

setDefaultEngine(myEngine); // call once at app startup
```

## `createRNPEngine(options?)`

Adapter for [`react-native-permissions`](https://github.com/zoontek/react-native-permissions).
Also re-exports the `Permissions` constants — see [types.md](./types.md) for the full list.

```ts
import { createRNPEngine, Permissions } from "react-native-permission-handler/rnp";
import { setDefaultEngine } from "react-native-permission-handler";

setDefaultEngine(createRNPEngine());
```

If `react-native-permissions` is installed, this is auto-wired by the RNP fallback and you don't
need to call it explicitly. Call `createRNPEngine({...})` explicitly when you need to pass options:

| Option | Type | Description |
|--------|------|-------------|
| `normalizePhotoLibrary` | `boolean` | Opt-in. Rewrites `unavailable` → `blocked` for photo library permissions. Useful when iOS reports `unavailable` in edge cases where the user could still recover through Settings. See the [android-normalization recipe](../recipes/android-normalization.md) for when to enable it. |
| `normalizeAndroid` | `boolean` | Opt-in. Applies a set of Android-specific fixes: (1) rewrites `POST_NOTIFICATIONS` denied → granted on API < 33, (2) treats dialog-dismiss misreported as blocked as `denied` until the 2nd request, and (3) replays the last `request()` result when `check()` lies about notifications state. |

The RNP adapter handles `"notifications"` internally by routing to `checkNotifications` and
`requestNotifications`.

### `Permissions.BUNDLES`

Platform-aware presets that resolve to `string[]` at runtime. Designed to be passed to
`useMultiplePermissions` when a single logical feature requires multiple native permissions.

```ts
import { Permissions } from "react-native-permission-handler/rnp";

Permissions.BUNDLES.BLUETOOTH;           // iOS: [BLUETOOTH]; Android 12+: [SCAN, CONNECT]; else [FINE_LOCATION]
Permissions.BUNDLES.LOCATION_BACKGROUND; // [LOCATION_WHEN_IN_USE, LOCATION_ALWAYS]
Permissions.BUNDLES.CALENDARS_WRITE_ONLY;// iOS 17+: dedicated write-only; else full calendar
```

See [ble-device-pairing](../recipes/ble-device-pairing.md) and
[background-location](../recipes/background-location.md) for full-flow examples.

## `createExpoEngine(config?)`

Adapter for Expo permission modules. Zero-config: with no arguments it auto-discovers installed
Expo modules and maps them to standard permission keys.

```ts
import { createExpoEngine } from "react-native-permission-handler/expo";
import { setDefaultEngine } from "react-native-permission-handler";

setDefaultEngine(createExpoEngine());
```

Auto-discovered keys include: `camera`, `microphone`, `locationForeground`, `locationBackground`,
`notifications`, `contacts`, `calendar`, `reminders`, `mediaLibrary`, `imagePickerCamera`,
`imagePickerMediaLibrary`, `tracking`, `brightness`, `audioRecording`, `audio`, `screenCapture`,
`cellular`, `pedometer`, `accelerometer`.

Override or add custom permissions by passing `config.permissions`:

```ts
import * as Camera from "expo-camera";

setDefaultEngine(
  createExpoEngine({
    permissions: {
      // Non-standard method names: use { get, request }
      camera: {
        get: () => Camera.getCameraPermissionsAsync(),
        request: () => Camera.requestCameraPermissionsAsync(),
      },
      // Standard modules: pass the module directly
      myCustom: myModule,
    },
  }),
);
```

Expo status mapping:

| Expo `status` | `canAskAgain` | Mapped to |
|---------------|---------------|-----------|
| `"granted"` | — | `"granted"` |
| `"undetermined"` | — | `"denied"` |
| `"denied"` | `true` | `"denied"` |
| `"denied"` | `false` | `"blocked"` |

## `createTestingEngine(initialStatuses?)`

A controllable engine for unit tests. Records every `check` / `request` call and lets you rewrite
statuses mid-test.

```ts
import { createTestingEngine } from "react-native-permission-handler/testing";

const engine = createTestingEngine({ "ios.permission.CAMERA": "denied" });

// drive tests
engine.setStatus("ios.permission.CAMERA", "granted");
engine.getRequestHistory();
engine.reset();
```

See the [testing recipe](../recipes/testing-with-testing-engine.md) for a full example.

## `createNoopEngine(defaultStatus?)`

A no-op engine useful for web builds and Storybook. Returns `defaultStatus` (default: `"granted"`)
for every `check` and `request`, and silently resolves `openSettings`.

```ts
import { createNoopEngine } from "react-native-permission-handler/noop";
import { setDefaultEngine } from "react-native-permission-handler";

if (Platform.OS === "web") {
  setDefaultEngine(createNoopEngine("granted"));
}
```

## Custom engines

Implement the interface directly when you need to wrap a bespoke backend:

```ts
import type { PermissionEngine } from "react-native-permission-handler";

const engine: PermissionEngine = {
  async check(permission) {
    const status = await myBackend.check(permission);
    return status === "ok" ? "granted" : "denied";
  },
  async request(permission) {
    return myBackend.request(permission);
  },
  async openSettings() {
    await myBackend.openSettings();
  },
};
```

Pass it per-hook via the `engine` prop, or globally via `setDefaultEngine(engine)`.
