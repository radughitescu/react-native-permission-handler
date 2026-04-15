# Recipe: foreground → background location

**Problem.** Your app needs background location (running tracker, ride-share driver mode, etc.),
but both iOS and Android require you to request the foreground permission first and only then
ask for the always/background permission. The native APIs expose both as separate permissions,
and getting the order wrong throws a confusing OS error.

**Solution.** Use `Permissions.BUNDLES.LOCATION_BACKGROUND`. On **Android** it expands to
`[ACCESS_FINE_LOCATION, ACCESS_BACKGROUND_LOCATION]` — two independent runtime permissions that
must be requested in order. On **iOS** it expands to just `[LOCATION_WHEN_IN_USE]` because iOS
models Core Location as a single authorization: you request "When In Use" first, then upgrade
to "Always" as a follow-up step on the same permission rather than as a separate request.
Feed the bundle into a **sequential** `useMultiplePermissions` call and the flow Just Works
on both platforms — on iOS you'll see one prompt, on Android two.

## What you'll use

- [`useMultiplePermissions`](../api/use-multiple-permissions.md) with `strategy: "sequential"`
- [`Permissions.BUNDLES.LOCATION_BACKGROUND`](../api/types.md#permissionsbundles)
- [`MultiPermissionEntry.id`](../api/use-multiple-permissions.md#multipermissionentry) — stable
  keys so the UI rows don't depend on the platform-specific permission string

## Code

```tsx
import React from "react";
import { Button, Text, View } from "react-native";
import { useMultiplePermissions } from "react-native-permission-handler";
import { Permissions } from "react-native-permission-handler/rnp";

// iOS: ["LOCATION_WHEN_IN_USE"] — one entry.
// Android: ["ACCESS_FINE_LOCATION", "ACCESS_BACKGROUND_LOCATION"] — two entries.
const LOCATION_BUNDLE = Permissions.BUNDLES.LOCATION_BACKGROUND;

const entries = LOCATION_BUNDLE.map((permission, index) => {
  const isBackground = index === 1; // only exists on Android
  return isBackground
    ? {
        id: "location-background",
        permission,
        prePrompt: {
          title: "Always allow location",
          message:
            "We need background location so your run keeps recording when the screen is off.",
        },
        blockedPrompt: {
          title: "Background location blocked",
          message: "Switch location to 'Always' in Settings for background tracking.",
        },
      }
    : {
        id: "location-foreground",
        permission,
        prePrompt: {
          title: "Location while using the app",
          message: "We need your location to track your run in real time.",
        },
        blockedPrompt: {
          title: "Location blocked",
          message: "Enable location access in Settings to continue.",
        },
      };
});

export function LiveTrackingSetup() {
  const perms = useMultiplePermissions({
    strategy: "sequential",
    permissions: entries,
    onAllGranted: () => startTracking(),
  });

  if (perms.allGranted) return <Text>Tracking…</Text>;

  return (
    <View>
      <Text>Enable location to start tracking your run.</Text>
      <Button title="Enable location" onPress={perms.request} />
      {perms.blockedPermissions.length > 0 && (
        <Text>Resolve the blocked permissions above, then tap again.</Text>
      )}
    </View>
  );
}

function startTracking() {
  // ...
}
```

## Why sequential, not parallel

On both iOS and Android, requesting background location before foreground is granted either no-ops
or outright fails. Sequential enforces the correct order: the background entry won't be prompted
until the foreground entry returns `granted`. If the user denies or dismisses the foreground
prompt, the flow stops — tap the "Enable location" button again to resume from the beginning, or
call `perms.resume()` to continue from the current ungranted step.

## iOS "Always" upgrades

On iOS, granting "When In Use" is the whole flow that this bundle can drive today. iOS does not
model "Always" as a separately requestable permission — the system expects you to call
`requestAlwaysAuthorization` as a second step on the already-granted permission. A dedicated
`upgradeToAlways()` API is tracked as future work on this library. In the meantime, after the
foreground grant you can trigger the upgrade yourself via `react-native-permissions` or your
native bridge.

## Handling partial grants (Android)

On Android, the user can grant foreground location and then deny background. Because each entry
has its own `blockedPrompt`, the flow will surface the blocked modal for the background entry
while keeping foreground granted. Use `perms.blockedPermissions` to show a summary row.

See also:

- [Onboarding wall recipe](./onboarding-wall.md) for a more general sequential-wall pattern with
  `resume()` after a user comes back from Settings.
- [Types and `BUNDLES`](../api/types.md) for the exact platform expansion of each bundle.
