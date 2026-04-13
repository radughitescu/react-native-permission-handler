# Recipe: onboarding permission wall

**Problem.** Your onboarding flow needs to collect four permissions in order — notifications,
camera, microphone, and location. You want a single progress bar, a clear "next" button per row,
and a way to resume after the user resolves a blocked permission in Settings.

**Solution.** A sequential `useMultiplePermissions` with stable `id` keys, per-row handlers, and
`resume()` wired to an AppState-return effect.

## What you'll use

- [`useMultiplePermissions`](../api/use-multiple-permissions.md)
- `handlers` — per-row `{ state, request, dismiss, dismissBlocked, openSettings }`
- `resume()` — restart the sequential queue from current ungranted statuses
- `blockedPermissions` — summary row for "resolve these in Settings"

## Code

```tsx
import React from "react";
import { Button, FlatList, Text, View } from "react-native";
import { useMultiplePermissions } from "react-native-permission-handler";
import { Permissions } from "react-native-permission-handler/rnp";

const ENTRIES = [
  {
    id: "notifications",
    label: "Notifications",
    permission: "notifications",
    prePrompt: { title: "Notifications", message: "Stay in the loop on new messages." },
    blockedPrompt: { title: "Notifications blocked", message: "Enable in Settings." },
  },
  {
    id: "camera",
    label: "Camera",
    permission: Permissions.CAMERA,
    prePrompt: { title: "Camera", message: "Take photos inside the app." },
    blockedPrompt: { title: "Camera blocked", message: "Enable in Settings." },
  },
  {
    id: "microphone",
    label: "Microphone",
    permission: Permissions.MICROPHONE,
    prePrompt: { title: "Microphone", message: "Record voice notes." },
    blockedPrompt: { title: "Microphone blocked", message: "Enable in Settings." },
  },
  {
    id: "location",
    label: "Location",
    permission: Permissions.LOCATION_WHEN_IN_USE,
    prePrompt: { title: "Location", message: "Find nearby friends." },
    blockedPrompt: { title: "Location blocked", message: "Enable in Settings." },
  },
];

export function OnboardingWall({ onDone }: { onDone: () => void }) {
  const perms = useMultiplePermissions({
    strategy: "sequential",
    permissions: ENTRIES.map(({ label, ...entry }) => entry),
    onAllGranted: onDone,
  });

  const grantedCount = Object.values(perms.statuses).filter(
    (s) => s === "granted" || s === "limited",
  ).length;

  return (
    <View>
      <Text>{`${grantedCount} of ${ENTRIES.length} ready`}</Text>

      <FlatList
        data={ENTRIES}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => {
          const handler = perms.handlers[item.id];
          const state = handler?.state ?? "idle";
          const granted = state === "granted" || state === "limited";
          return (
            <View>
              <Text>{item.label}</Text>
              <Text>Status: {state}</Text>
              {!granted && state !== "blockedPrompt" && (
                <Button title="Allow" onPress={handler?.request} />
              )}
              {state === "blockedPrompt" && (
                <Button title="Open Settings" onPress={handler?.openSettings} />
              )}
            </View>
          );
        }}
      />

      {perms.activePermission === null && !perms.allGranted && (
        <Button title="Continue" onPress={perms.resume} />
      )}

      {perms.blockedPermissions.length > 0 && (
        <Text>
          Blocked: {perms.blockedPermissions.join(", ")}. Resolve in Settings, then tap Continue.
        </Text>
      )}
    </View>
  );
}
```

## How `resume()` fits in

Sequential flows stop on the first denial or dismissal. `resume()`:

1. Looks at the current `statuses` snapshot.
2. Rebuilds the pending queue from everything that is **not** `granted` or `limited`.
3. Starts from the first pending entry.

It is **not** the same as `request()`: `request()` re-checks every entry from scratch, which will
re-trigger `checking` on already-granted rows. `resume()` skips the granted ones, so progress is
preserved across a trip to the Settings app.

## Stable `id` keys

Every entry has an explicit `id`. This matters because `Permissions.CAMERA` resolves to
`"ios.permission.CAMERA"` on iOS and `"android.permission.CAMERA"` on Android. Without a stable
`id`, your `handlers` and `statuses` records would be keyed differently per platform — an easy
source of bugs.

## Testing this flow

Use `createTestingEngine` to drive every row through `denied → granted` without touching native
code. See the [testing recipe](./testing-with-testing-engine.md).
