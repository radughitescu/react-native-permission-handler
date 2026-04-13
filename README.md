# react-native-permission-handler

Smart permission UX flows for React Native. Pre-prompts, blocked handling, settings redirect, and
foreground re-check — in one hook, one component, and a pluggable engine. Works with
[`react-native-permissions`](https://github.com/zoontek/react-native-permissions), Expo modules,
or any custom backend.

```tsx
import { PermissionGate } from "react-native-permission-handler";
import { Permissions } from "react-native-permission-handler/rnp";

export function QRScannerScreen() {
  return (
    <PermissionGate
      permission={Permissions.CAMERA}
      prePrompt={{ title: "Camera", message: "We need your camera to scan QR codes." }}
      blockedPrompt={{ title: "Camera blocked", message: "Enable camera in Settings." }}
      fallback={<Spinner />}
    >
      <QRScanner />
    </PermissionGate>
  );
}
```

That's the whole flow: pre-prompt modal, system dialog, blocked recovery, Settings round-trip,
and AppState re-check on return. No state machine to wire up, no foreground listener to juggle.

## Why this library

- **Pure state machine at the core.** 12 states, pure transitions, no React or native code
  underneath. Every hook and component is a thin side-effect layer on top.
- **Pluggable engines.** Bring your own permissions backend. Zero-config with
  `react-native-permissions`, auto-discovery with Expo modules, plus `createTestingEngine` for
  unit tests and `createNoopEngine` for web/Storybook.
- **Declarative components, RN primitives only.** `PermissionGate`, `DefaultPrePrompt`,
  `DefaultBlockedPrompt`, and `LimitedUpgradePrompt` — no third-party UI dependencies, override
  any of them with a render prop.

## Installation

```bash
npm install react-native-permission-handler
```

Then pick a permissions backend:

```bash
# Option A: react-native-permissions (recommended, auto-detected)
npm install react-native-permissions

# Option B: Expo modules (auto-discovered from installed expo-* packages)

# Option C: custom — implement the PermissionEngine interface yourself
```

With `react-native-permissions` installed, the library auto-creates an engine the first time a
hook runs. Zero config needed.

## Quick start

### With `PermissionGate` (declarative)

```tsx
import { PermissionGate } from "react-native-permission-handler";
import { Permissions } from "react-native-permission-handler/rnp";

<PermissionGate
  permission={Permissions.CAMERA}
  prePrompt={{ title: "Camera", message: "We need your camera." }}
  blockedPrompt={{ title: "Blocked", message: "Enable in Settings." }}
  fallback={<Spinner />}
>
  <CameraView />
</PermissionGate>
```

### With `usePermissionHandler` (imperative)

```tsx
import { usePermissionHandler } from "react-native-permission-handler";
import { Permissions } from "react-native-permission-handler/rnp";

function CameraScreen() {
  const camera = usePermissionHandler({
    permission: Permissions.CAMERA,
    prePrompt: { title: "Camera", message: "We need your camera." },
    blockedPrompt: { title: "Blocked", message: "Enable in Settings." },
    onGrant: () => analytics.track("camera_granted"),
  });

  if (camera.isChecking) return <Spinner />;
  if (camera.isGranted) return <CameraView />;
  if (camera.isUnavailable) return <Text>Camera not available.</Text>;
  return null; // default pre-prompt / blocked modals render on top
}
```

## The state machine

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

`limited` is a sibling of `granted` — iOS 14+ partial photo access. `isGranted` is `true` for
both, but `isLimited` lets you surface an upgrade prompt. See the full state list in
[docs/api/types.md](./docs/api/types.md).

## Core APIs

Every API is documented in depth under [docs/api/](./docs/api/README.md).

- **[`usePermissionHandler`](./docs/api/use-permission-handler.md)** — single-permission hook.
  Full lifecycle: check, pre-prompt, request, blocked recovery, settings round-trip, optional
  `requestFullAccess` for limited → granted upgrade.
- **[`useMultiplePermissions`](./docs/api/use-multiple-permissions.md)** — sequential or parallel
  multi-permission orchestration. Per-permission handlers, stable `id` keys, `resume()` after a
  Settings trip, `blockedPermissions` summary.
- **[`PermissionGate`](./docs/api/permission-gate.md)** — declarative component. `renderPrePrompt`,
  `renderBlockedPrompt`, `renderDenied`, and `renderLimited` render props.
- **[`transition(state, event)`](./docs/api/types.md)** — raw pure state machine function. Build
  your own hook or integrate with a state library.

## Engines

An engine is the pluggable adapter between this library and the actual permissions backend. See
[docs/api/engines.md](./docs/api/engines.md) for the full reference, including resolution order
(`engine` prop > `setDefaultEngine()` > auto RNP fallback).

- `createRNPEngine({ normalizePhotoLibrary?, normalizeAndroid? })` — `react-native-permissions`
  adapter with opt-in Android and photo-library status normalization.
- `createExpoEngine()` — Expo modules adapter. Zero config, auto-discovers installed
  `expo-camera`, `expo-location`, `expo-notifications`, etc.
- `createTestingEngine(initialStatuses?)` — controllable engine for unit tests.
- `createNoopEngine(defaultStatus?)` — always-granted stub for web builds and Storybook.
- Any object implementing `PermissionEngine` — roll your own.

## Recipes

Drop-in solutions to real problems. See [docs/recipes/](./docs/recipes/README.md).

- **[Limited photo access + upgrade](./docs/recipes/limited-photo-upgrade.md)** — iOS 14+ partial
  grants, `renderLimited`, and `requestFullAccess()`.
- **[Background location](./docs/recipes/background-location.md)** — sequential
  `Permissions.BUNDLES.LOCATION_BACKGROUND` flow.
- **[Onboarding permission wall](./docs/recipes/onboarding-wall.md)** — sequential wall with
  `id` keys, per-row handlers, and `resume()` after Settings.
- **[Bluetooth device pairing](./docs/recipes/ble-device-pairing.md)** — `Permissions.BUNDLES.BLUETOOTH`
  handles Android 12+ scan/connect and older-Android location fallback automatically.
- **[Voice note composer](./docs/recipes/voice-note-composer.md)** — inline mic access with
  `skipPrePrompt: "android"`.
- **[Android status normalization](./docs/recipes/android-normalization.md)** — when and why to
  enable `normalizeAndroid` and `normalizePhotoLibrary`.
- **[Testing with `createTestingEngine`](./docs/recipes/testing-with-testing-engine.md)** — fake
  engines for fast unit tests without native mocks.

## Platform gotchas

**iOS:**

- The system permission dialog only shows **once** per permission, ever. Once denied via the
  system dialog, there is no programmatic path back — only Settings. Always show a pre-prompt
  first to warm the user up.
- `check()` returns `denied` for both "never asked" and "denied once" — both are still requestable.
- `limited` is an iOS 14+ state for photo library partial access. `isGranted` is `true` for it
  (backward compatible), `isLimited` distinguishes it.

**Android:**

- After 2 denials, Android 11+ auto-blocks the permission. No more system dialogs.
- `checkNotifications()` never returns `blocked` on Android 13+ — the RNP engine handles this
  internally. Enable `normalizeAndroid: true` to also cache the last `request()` result for
  accurate `check()` reads.
- "One-time" permission grants (location, camera, mic) auto-revoke after ~30–60s of backgrounding.
- **Android 16 (API 36+) hang.** `request()` can hang indefinitely when a permission is in
  `never_ask_again` state ([facebook/react-native#53887](https://github.com/facebook/react-native/issues/53887)).
  The library auto-applies a 5 s `requestTimeout` default on Android 16 and routes to the blocked
  prompt on expiry. Override with an explicit `requestTimeout` per-hook if you need different
  behavior.

**Notifications:** pass `"notifications"` as the permission identifier. The RNP engine routes to
`checkNotifications`/`requestNotifications`. For Expo, map `"notifications"` to `expo-notifications`
in the engine config (or rely on auto-discovery).

## What's new in v0.7.0

- **`requestFullAccess()`** on the hook result — upgrade from limited → granted without leaving
  the app. Engine-routed, throws with a clear error if unsupported.
- **`renderLimited`** on `PermissionGate` — custom UI during iOS 14+ partial photo access.
- **`Permissions.BUNDLES`** — `BLUETOOTH`, `LOCATION_BACKGROUND`, and `CALENDARS_WRITE_ONLY`
  presets that resolve to the correct `string[]` per platform and OS version.
- **`MultiPermissionEntry.id`** — stable cross-platform keys for `statuses`/`handlers` records.
- **`resume()`** on `useMultiplePermissions` — restart a stopped sequential flow from current
  ungranted statuses, preserving already-granted progress.
- **`skipPrePrompt: boolean | "android"`** — one-tap composer flows without a pre-prompt modal,
  safely scoped to Android only.
- **Optional `prePrompt` / `blockedPrompt`** config — custom-UI users no longer need dummy
  configs to satisfy types.
- **Android 16 auto-recovery** — 5 s default `requestTimeout` on API 36+, routed to the blocked
  prompt on expiry.
- **`createRNPEngine({ normalizeAndroid, normalizePhotoLibrary })`** — opt-in Android status
  normalization (pre-13 `POST_NOTIFICATIONS`, dialog-dismiss misreports, stale check cache) and
  iOS photo-library `unavailable → blocked` rewrite.

See [docs/api/](./docs/api/README.md) and [docs/recipes/](./docs/recipes/README.md) for full
details.

## Requirements

- React Native >= 0.76
- React >= 18
- One of:
  - `react-native-permissions` >= 4.0.0 (auto-detected, zero config)
  - Expo permission modules (use `createExpoEngine`)
  - Custom `PermissionEngine` implementation

## Contributing

Issues and PRs welcome. The project uses Biome for linting, Vitest for tests, and tsup for
builds. Run `npm test && npm run lint && npm run typecheck` before submitting a PR.

## License

MIT
