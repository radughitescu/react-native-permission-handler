# Engines

An engine is the pluggable adapter that this library uses to talk to the actual permissions
backend. Every hook and component reaches state through an engine — the library itself ships
zero native code.

## The `PermissionEngine` interface

```ts
interface PermissionEngine {
  check(permission: string): Promise<PermissionStatus>;
  request(permission: string): Promise<PermissionStatus>;
  openSettings(permission?: string): Promise<void>;
  requestFullAccess?(permission: string): Promise<PermissionStatus>;
}

type PermissionStatus = "granted" | "denied" | "blocked" | "limited" | "unavailable";
```

An engine is responsible for:

- Mapping its backend's native status values to the library's `PermissionStatus`.
- Routing special cases like notifications to the correct API (e.g., `checkNotifications` on RNP).
- Opening the correct settings screen for the platform. On iOS, the optional `permission`
  parameter enables best-effort deep-linking into the per-permission Settings sub-page; engines
  fall back to generic Settings if the deep-link fails.
- Optionally, implementing `requestFullAccess` for the iOS limited-access upgrade flow (14+ photo
  library, 18+ contacts). Hooks call this via `PermissionHandlerResult.requestFullAccess()` and
  throw a clear error if it is not implemented.

### iOS Settings deep-linking

When `openSettings(permission)` is called with a permission identifier, the RNP and Expo engines
build an iOS `App-Prefs:root=Privacy&path=<PATH>` URL and attempt to open it. The mapping is
substring-based and accepts RNP constants, Expo keys, and plain strings:

| Input (case-insensitive, substring match)                | iOS Settings path |
|----------------------------------------------------------|-------------------|
| `camera`                                                  | `CAMERA` |
| `microphone` / `record_audio`                             | `MICROPHONE` |
| `photo` / `mediaLibrary` / `read_media_*`                 | `PHOTOS` |
| `location` (including foreground/background variants)     | `LOCATION` |
| `contacts`                                                | `CONTACTS` |
| `calendar`                                                | `CALENDARS` |
| `reminders`                                               | `REMINDERS` |
| `motion`                                                  | `MOTION` |
| `bluetooth`                                               | `BLUETOOTH` |
| anything else (notifications, tracking, etc.)             | *fall back to generic Settings* |

The `App-Prefs:` URL scheme is unofficial — iOS may reject it on some versions. Every deep-link
attempt is wrapped in try/catch, so a failed `openURL` falls through to the generic
`openSettings()` path without throwing. Treat the deep-link as a best-effort UX enhancement, not
a guarantee. On Android, the `permission` parameter is ignored because RNP's `openSettings()`
already lands on the app-specific permissions page.

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

### `requestFullAccess` on the RNP engine

Supported for two permissions, each gated behind a `react-native-permissions` version floor:

| Permission | Native picker | Version floor |
|------------|----------------|----------------|
| `Permissions.PHOTO_LIBRARY` (iOS 14+ limited access) | `openPhotoPicker()` | `>=5.5.1` |
| `Permissions.CONTACTS` (iOS 18+ limited access) | `openContactPicker()` | `>=5.6.0` |

Calling `requestFullAccess()` for any other permission throws. Calling it on an older
`react-native-permissions` version — where the picker export doesn't exist yet — throws a
descriptive error naming the missing export and the required version floor. After the picker
resolves, the engine re-checks the permission through `check()` and returns the normalized
status.

**Gotcha:** `react-native-permissions` >= 5.5.3 is also the floor for two related status reads
that `requestFullAccess` flows depend on: `request(Permissions.CONTACTS)` returns `limited` on
an iOS 18 partial contacts grant, and `check(Permissions.LOCATION_ALWAYS)` returns `denied`
(still requestable) rather than `blocked` after only "When In Use" has been granted.

### `Permissions.BUNDLES`

Platform-aware presets that resolve to `string[]` at runtime. Designed to be passed to
`useMultiplePermissions` when a single logical feature requires multiple native permissions.

```ts
import { Permissions } from "react-native-permission-handler/rnp";

Permissions.BUNDLES.BLUETOOTH;           // iOS: [BLUETOOTH]; Android 12+: [SCAN, CONNECT]; else [FINE_LOCATION]
Permissions.BUNDLES.LOCATION_BACKGROUND; // iOS: [LOCATION_WHEN_IN_USE]; Android: [ACCESS_FINE_LOCATION, ACCESS_BACKGROUND_LOCATION]
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

| Expo `status` | `accessPrivileges` | `canAskAgain` | Mapped to |
|---------------|---------------------|---------------|-----------|
| `"granted"` | — | — | `"granted"` |
| `"granted"` | `"limited"` | — | `"limited"` |
| `"limited"` | — | — | `"limited"` |
| `"undetermined"` | — | — | `"denied"` |
| `"denied"` | — | `true` | `"denied"` |
| `"denied"` | — | `false` | `"blocked"` |

### `requestFullAccess` on the Expo engine

Auto-discovers pickers from installed Expo modules:

- **`expo-media-library`** — for the `mediaLibrary` and `imagePickerMediaLibrary` keys, calls
  `presentPermissionsPicker()` (or the legacy `presentPermissionsPickerAsync()` on older
  versions).
- **`expo-contacts`** — for the `contacts` key, calls `presentAccessPicker()` (or the legacy
  `presentAccessPickerAsync()`).

Pass `config.fullAccessPickers` to override or add pickers for other keys:

```ts
createExpoEngine({
  fullAccessPickers: {
    mediaLibrary: async () => {
      await MediaLibrary.presentPermissionsPickerAsync();
    },
  },
});
```

After the picker resolves, the engine re-checks the permission and returns the normalized
status. Calling `requestFullAccess()` for a key with no discovered or configured picker throws.

## `createTestingEngine(initialStatuses?, options?)`

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

**Defaults for unseeded permissions.** Both `check()` and `request()` return `"denied"` for
permissions you have not explicitly seeded via `initialStatuses` or `setStatus`. This keeps
test behavior symmetric and predictable — a permission you forgot to set up won't silently
grant on `request()`.

**`options.autoGrantUnset`** — pass `{ autoGrantUnset: true }` to restore the happy-path
shortcut where `request()` returns `"granted"` for unseeded permissions (while `check()` still
returns `"denied"`). Useful when you want to test grant flows without enumerating every
permission up front.

**`options.fullAccessResult`** — the status `requestFullAccess()` sets after simulating the
picker. Defaults to `"granted"`. Every call records a `{ permission, method: "requestFullAccess" }`
entry in `getRequestHistory()`, and sets the permission's stored status to `fullAccessResult` so
the next `check()` reflects the upgrade.

```ts
const engine = createTestingEngine(
  { camera: "limited" },
  { fullAccessResult: "granted" },
);

await engine.requestFullAccess("camera"); // "granted"
engine.getRequestHistory(); // [{ permission: "camera", method: "requestFullAccess" }]
```

```ts
// Symmetric default: both check and request return "denied" for unseeded permissions.
const strict = createTestingEngine({ camera: "denied" });

// Happy-path shortcut: request() auto-grants anything not seeded.
const lenient = createTestingEngine({}, { autoGrantUnset: true });
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
