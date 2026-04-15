# Recipe: precise vs approximate location UI

**Problem.** Your delivery-tracking app shows "You are 500m from the courier" and a pin on a
live map. On iOS 14+, the user can grant *Precise Location* or *Approximate Location* —
approximate is rounded to a region a few kilometers wide. The UI keeps rendering a confident pin
and an ETA, both silently wrong by city blocks. Nothing in `state` or `isGranted` tells you which
accuracy level you're running on.

**Solution.** After the location permission resolves `granted`, read
`result.metadata.locationAccuracy`. When it's `"reduced"`, swap the precise map for a
neighborhood-level view, label the ETA as approximate, and offer a Settings deep-link so the user
can upgrade to precise. The Expo engine captures this value automatically on every
`check`/`request`, so there's no extra native round-trip to make.

## What you'll use

- [`usePermissionHandler`](../api/use-permission-handler.md) — `metadata` field on the result
- [`PermissionMetadata`](../api/types.md#permissionmetadata) — shape of `locationAccuracy`
- [Engines reference](../api/engines.md) — which engine populates what
- `recheckOnForeground: true` so the UI recovers when the user toggles accuracy in Settings

## Code

```tsx
import React from "react";
import { Button, Text, View } from "react-native";
import { usePermissionHandler } from "react-native-permission-handler";
import { Permissions } from "react-native-permission-handler/rnp";

export function DeliveryTracker() {
  const location = usePermissionHandler({
    permission: Permissions.LOCATION_WHEN_IN_USE,
    recheckOnForeground: true,
    prePrompt: {
      title: "Track your delivery",
      message: "We use your location to show how far away the courier is.",
    },
    blockedPrompt: {
      title: "Location blocked",
      message: "Enable location access in Settings to track your delivery.",
    },
  });

  if (!location.isGranted) return null;

  const isReduced = location.metadata.locationAccuracy === "reduced";

  if (isReduced) {
    return (
      <View>
        <NeighborhoodMap />
        <Text>Delivery ETA: approximate (precise location off)</Text>
        <Button
          title="Switch to Precise Location"
          onPress={location.openSettings}
        />
      </View>
    );
  }

  return (
    <View>
      <PreciseMap />
      <Text>Delivery ETA: 12 min</Text>
    </View>
  );
}

function PreciseMap() {
  return <Text>Precise map with live courier pin</Text>;
}

function NeighborhoodMap() {
  return <Text>Region overview</Text>;
}
```

## Pair it with `recheckOnForeground`

Accuracy can change while your app is backgrounded — the user can open Settings, flip *Precise
Location* off, and return. Core Location will update `accuracyAuthorization` on the next app
activation, but your hook won't notice unless you opt in to a foreground re-check. With
`recheckOnForeground: true`, the library calls `check()` on every `background → active`
transition and the new `metadata.locationAccuracy` value flows through on the same render. See
[re-check on foreground](./recheck-on-foreground.md) for the full semantics.

## Reading metadata at the right time

`metadata.locationAccuracy` is `undefined` until at least one location permission call has
resolved. Guard on `isGranted` (or `state === "granted"`) before branching on it. On first mount,
before the initial `check()` completes, the field is not yet populated — treat "undefined" as
"unknown, assume precise and reconcile on the next render".

## Upgrading reduced → precise

There is no runtime API in this library to re-prompt for precise accuracy; the only user-visible
path is Settings, which is what `openSettings()` opens. Apple does provide a HIG-endorsed pattern
for asking for a one-shot session-scoped upgrade
(`CLLocationManager.requestTemporaryFullAccuracyAuthorization(withPurposeKey:)`), which shows a
system sheet and lasts until the app is backgrounded. It requires
`NSLocationTemporaryUsageDescriptionDictionary` in `Info.plist` with a purpose key that matches
the string you pass at runtime — if the Info.plist entry is missing the call silently no-ops.
This API is not currently exposed through the library's engine interface; if you need it today,
call it directly through your Expo or native module. See Apple's
[temporary full-accuracy authorization docs](https://developer.apple.com/documentation/corelocation/requesting-authorization-to-use-location-services#Request-temporary-access-to-accurate-location)
for the full pattern.

## Non-Expo engines

**Important:** `metadata.locationAccuracy` is populated only by the Expo engine (`createExpoEngine`
with Expo SDK 55+). The `react-native-permissions` engine does not currently expose Core
Location's accuracy authorization level through a JS binding, so `metadata.locationAccuracy` will
be `undefined` even after a successful grant. If you're on the RNP engine and need accuracy, read
it directly from `Geolocation.getCurrentPosition` (the `accuracy` field on the result), or
contribute the binding upstream.

## Android note

On Android, there is no equivalent of iOS *reduced accuracy* at the permission level —
`ACCESS_COARSE_LOCATION` and `ACCESS_FINE_LOCATION` are separate permissions, not two authorization
levels on the same permission. `metadata.locationAccuracy` will be `undefined` on Android; don't
gate Android UX on it. If you need to distinguish fine vs coarse on Android, request
`ACCESS_FINE_LOCATION` explicitly and check for `granted`.

## See also

- [Limited photo access + upgrade](./limited-photo-upgrade.md) — parallel pattern: detect a
  restricted grant, render a reduced UI, offer an upgrade path.
- [Re-check on foreground](./recheck-on-foreground.md) — why `recheckOnForeground: true` is
  essential when your UI depends on authorization metadata.
- [Background location](./background-location.md) — if you also need `LOCATION_BACKGROUND`, the
  accuracy field still applies.
