# Recipe: Bluetooth device pairing

**Problem.** Your app pairs with a BLE device. On Android 12+ you need both `BLUETOOTH_SCAN` and
`BLUETOOTH_CONNECT`. On Android 11 and earlier you instead need coarse/fine location (because the
OS treats BLE as a location-adjacent capability). On iOS you just need the iOS Bluetooth permission.

**Solution.** Use `Permissions.BUNDLES.BLUETOOTH`. The bundle resolves to the correct set of
platform strings at runtime, so your code reads the same on every device.

## What you'll use

- [`Permissions.BUNDLES.BLUETOOTH`](../api/types.md#permissionsbundles)
- [`useMultiplePermissions`](../api/use-multiple-permissions.md) — parallel strategy (order doesn't
  matter for BLE)
- Stable `id` keys so UI rows don't need platform-specific logic

## Code

```tsx
import React from "react";
import { Button, Text, View } from "react-native";
import { useMultiplePermissions } from "react-native-permission-handler";
import { Permissions } from "react-native-permission-handler/rnp";

const BLE_BUNDLE = Permissions.BUNDLES.BLUETOOTH;

export function DevicePairingScreen() {
  const perms = useMultiplePermissions({
    strategy: "parallel",
    permissions: BLE_BUNDLE.map((permission, index) => ({
      id: `ble-${index}`,
      permission,
      prePrompt: {
        title: "Bluetooth access",
        message: "We need Bluetooth so you can pair your device.",
      },
      blockedPrompt: {
        title: "Bluetooth blocked",
        message: "Enable Bluetooth permissions in Settings to finish pairing.",
      },
    })),
    onAllGranted: () => startScanning(),
  });

  if (perms.allGranted) return <Text>Scanning for devices…</Text>;

  return (
    <View>
      <Text>Allow Bluetooth to find your device.</Text>
      <Button title="Enable Bluetooth" onPress={perms.request} />
    </View>
  );
}

function startScanning() {
  // ...
}
```

## Bundle expansion

| Platform | `BUNDLES.BLUETOOTH` |
|----------|---------------------|
| iOS | `[ios.permission.BLUETOOTH]` |
| Android 12+ (API 31+) | `[BLUETOOTH_SCAN, BLUETOOTH_CONNECT]` |
| Android 11 and below | `[ACCESS_FINE_LOCATION]` |

Because the bundle is computed lazily per runtime, the exact array length is platform-specific —
that's why the example uses `map((permission, index) => ({ id: \`ble-${index}\`, ... }))` to
generate stable keys without hard-coding permission strings.

## Why not `Permissions.BLUETOOTH` directly?

`Permissions.BLUETOOTH` exists as a single-value cross-platform constant, but on Android 12+ BLE
scanning genuinely requires two permissions. Using the bundle keeps your code compliant on modern
Android without a platform fork at the call site.

## Next steps

- For foreground + background location, see [background-location](./background-location.md).
- For full onboarding flows with stop-and-resume, see [onboarding-wall](./onboarding-wall.md).
