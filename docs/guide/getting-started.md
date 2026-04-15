# Getting Started

Smart permission UX flows for React Native. Pre-prompts, blocked handling, settings redirect, and foreground re-check — in one hook, one component, and a pluggable engine. Works with [`react-native-permissions`](https://github.com/zoontek/react-native-permissions), Expo modules, or any custom backend.

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

With `react-native-permissions` installed, the library auto-creates an engine the first time a hook runs. Zero config needed.

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

That's the whole flow: pre-prompt modal, system dialog, blocked recovery, Settings round-trip, and AppState re-check on return. No state machine to wire up, no foreground listener to juggle.

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

## Why this library

- **Pure state machine at the core.** 12 states, pure transitions, no React or native code underneath. Every hook and component is a thin side-effect layer on top.
- **Pluggable engines.** Bring your own permissions backend. Zero-config with `react-native-permissions`, auto-discovery with Expo modules, plus `createTestingEngine` for unit tests and `createNoopEngine` for web/Storybook.
- **Declarative components, RN primitives only.** `PermissionGate`, `DefaultPrePrompt`, `DefaultBlockedPrompt`, and `LimitedUpgradePrompt` — no third-party UI dependencies, override any of them with a render prop.

## Next steps

- Browse the [API reference](/api/) for hook, component, and engine details.
- Pick a [recipe](/recipes/) for your use case — onboarding walls, background location, limited photo upgrades, and more.
- Compare [before & after](/before-after) to see what the library removes from your code.
