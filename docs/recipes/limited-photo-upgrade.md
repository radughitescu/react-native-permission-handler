# Recipe: limited photo access + upgrade

**Problem.** On iOS 14+, users can grant "Selected Photos" (partial) access to the photo library.
The feature works, but you want to let users upgrade to full access without forcing them through
Settings.

**Solution.** Detect the `limited` state, render a branded upgrade prompt, and call
`requestFullAccess()` on the hook result. The engine opens the native Limited Photo Picker (on
iOS 15+) or re-presents the upgrade dialog.

## What you'll use

- [`usePermissionHandler`](../api/use-permission-handler.md) — `isLimited` and `requestFullAccess`
- [`PermissionGate`](../api/permission-gate.md) — `renderLimited` prop
- `LimitedUpgradePrompt` — default upgrade modal

## Code

```tsx
import React from "react";
import { Text, View } from "react-native";
import {
  LimitedUpgradePrompt,
  PermissionGate,
  usePermissionHandler,
} from "react-native-permission-handler";
import { Permissions } from "react-native-permission-handler/rnp";

export function ProfilePhotoPicker() {
  return (
    <PermissionGate
      permission={Permissions.PHOTO_LIBRARY}
      prePrompt={{
        title: "Photo access",
        message: "We need access to your photos so you can pick a profile picture.",
      }}
      blockedPrompt={{
        title: "Photos blocked",
        message: "Enable photo access for this app in Settings.",
      }}
      renderLimited={(handler) => (
        <View>
          <PhotoPicker />
          <LimitedUpgradePrompt
            visible
            title="Allow full access?"
            message="You gave access to a few photos. Allow full access to choose from your whole library."
            upgradeLabel="Allow Full Access"
            dismissLabel="Keep current selection"
            onUpgrade={async () => {
              await handler.requestFullAccess();
            }}
            onDismiss={handler.dismissBlocked}
          />
        </View>
      )}
    >
      <PhotoPicker />
    </PermissionGate>
  );
}

function PhotoPicker() {
  return <Text>Picker goes here</Text>;
}
```

## Using the hook directly

If you need more control than `PermissionGate` provides:

```tsx
function PhotoUploadScreen() {
  const photos = usePermissionHandler({
    permission: Permissions.PHOTO_LIBRARY,
    prePrompt: { title: "Photos", message: "Needed to upload." },
    blockedPrompt: { title: "Blocked", message: "Enable in Settings." },
  });

  if (photos.isLimited) {
    return (
      <View>
        <PhotoPicker />
        <Button
          title="Allow full access"
          onPress={async () => {
            const next = await photos.requestFullAccess();
            if (next === "granted") {
              analytics.track("photo_upgrade_granted");
            }
          }}
        />
      </View>
    );
  }

  if (photos.isGranted) return <PhotoPicker />;
  return null;
}
```

## Why `isGranted` is still `true` in `limited`

For backward compatibility, `isGranted` returns `true` for both `granted` and `limited` — existing
code that only branches on `isGranted` keeps working. Use `isLimited` to detect the narrower case,
or branch directly on `state` if you want exclusive behavior.

## Engine requirements

`requestFullAccess()` delegates to `engine.requestFullAccess()`, which is optional on the
`PermissionEngine` interface.

- **RNP engine** (`createRNPEngine`) — supported for `Permissions.PHOTO_LIBRARY` via
  `openPhotoPicker()`, the native Limited Photo Picker. Requires
  `react-native-permissions` >= 5.5.1. **Gotcha:** on an older `react-native-permissions` version
  the engine throws a descriptive error naming the missing export and the required version floor,
  instead of silently no-op'ing.
- **Expo engine** (`createExpoEngine`) — supported end-to-end. Auto-discovers `expo-media-library`
  and calls its `presentPermissionsPicker` (or the legacy `presentPermissionsPickerAsync`) for the
  `mediaLibrary` and `imagePickerMediaLibrary` keys. Override the picker via
  `config.fullAccessPickers`.
- **Testing engine** (`createTestingEngine`) — simulates the picker: `requestFullAccess()` records
  a `"requestFullAccess"` history entry and sets the permission's status to the
  `fullAccessResult` option (default `"granted"`).
- **Custom engine** — implement `requestFullAccess` on your adapter (e.g. wrap your own native
  shim around the iOS 15+ limited picker API).

Both the RNP and Expo engines re-check the permission's status after the picker resolves and
return the normalized result, so `requestFullAccess()`'s return value always reflects the real
post-picker state rather than an assumption that the user upgraded.

See the [engines reference](../api/engines.md) for details.

## Android note

On Android, there is no concept of "limited" photo access at the permission level. The
`READ_MEDIA_VISUAL_USER_SELECTED` permission behaves like a separate permission rather than a
partial grant, so the hook will usually stay in `granted` on Android for this flow. The
`renderLimited` branch only fires on iOS.
