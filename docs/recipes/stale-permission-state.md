# Recipe: working around stale permission state on Expo cold start

**Problem.** Expo Managed Workflow apps that use
`Location.getBackgroundPermissionsAsync()` (or any `expo-location` permission hook) may observe
**stale `undetermined` status** on app restart: the first call returns `undetermined` even when
the true status is `denied`, and subsequent calls return the correct value a moment later. This
races with any `if (status === "undetermined")` gate in your app logic.

**Source:** [expo/expo#42084](https://github.com/expo/expo/issues/42084) — Expo's location hook
caches the last-seen value across process boundaries, and the initial stale read races the
fresh system check.

**Solution.** Wrap the permission in `usePermissionHandler` with `recheckOnForeground: true`.
The library calls `engine.check()` directly (bypassing Expo's hook cache) and the
`recheckOnForeground` flag ensures any foreground transition re-runs the check. The hook's
`autoCheck: true` (default) also runs a fresh check on mount — which is the fix for the
cold-start stale read.

## What you'll use

- [`usePermissionHandler`](../api/use-permission-handler.md) — the hook calls
  `engine.check(permission)` on mount, which hits the native module directly and avoids
  Expo's hook-level cache.
- [`createExpoEngine`](../api/engines.md#createexpoengine) — Expo engine with auto-discovered
  `expo-location` module.
- `recheckOnForeground: true` — belt-and-braces foreground recheck for long-lived sessions.

## Minimal example

```tsx
import { useMultiplePermissions, usePermissionHandler } from "react-native-permission-handler";
import { createExpoEngine } from "react-native-permission-handler/expo";

const engine = createExpoEngine();

function LocationGate() {
  // On cold start, autoCheck hits engine.check("locationBackground") directly.
  // The library's hook does not go through Expo's useForegroundPermissions /
  // useBackgroundPermissions hooks, so the stale-cache race from Expo #42084
  // does not apply.
  const location = usePermissionHandler({
    engine,
    permission: "locationBackground",
    recheckOnForeground: true,
    prePrompt: {
      title: "Background location",
      message: "We keep tracking your run when the screen is off.",
    },
    blockedPrompt: {
      title: "Background location blocked",
      message: "Enable 'Always Allow' location in Settings.",
    },
  });

  if (location.isGranted) return <RunTracker />;
  return <LocationPrompt handler={location} />;
}
```

## Why this works

Expo's own permission hooks (e.g. `Location.useBackgroundPermissions()`) maintain module-level
state that can outlive a process and be re-read on the next cold start before the native layer
responds. This library's hooks never touch that cache: every `check()` and `request()` call
resolves through the engine adapter, which calls the native Expo function directly. A fresh
result always reflects the actual system status.

The trade-off: you pay one extra native round-trip on mount (vs. Expo's cached hook returning
immediately). In practice this is imperceptible and the correctness win is worth it — stale
`undetermined` reads have cost Expo developers real production bugs.

## Combining with `recheckOnForeground`

Even without the Expo bug, long-lived screens benefit from re-checking on foreground return in
case the user toggled the permission in Settings mid-session. See the
[recheck-on-foreground recipe](./recheck-on-foreground.md) for the full semantics.

## See also

- [Recheck on foreground](./recheck-on-foreground.md) — general-purpose recipe for the
  `recheckOnForeground` option.
- [Engines reference — `createExpoEngine`](../api/engines.md#createexpoengine).
- Upstream bug: [expo/expo#42084](https://github.com/expo/expo/issues/42084).
