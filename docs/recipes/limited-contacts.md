# Recipe: limited contacts access + upgrade

**Problem.** On iOS 18+, users can grant access to a hand-picked subset of contacts instead of the
full address book. `request()` reports `limited` for that grant. Your app should let users upgrade
to full contacts access without forcing them through Settings.

**Solution.** Detect the `limited` state, render a branded upgrade prompt, and call
`requestFullAccess()` on the hook result — the same flow as [limited photo access](./limited-photo-upgrade.md).
The engine opens the native contacts picker so the user can add more contacts to the shared set.

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

export function ContactsPicker() {
  return (
    <PermissionGate
      permission={Permissions.CONTACTS}
      prePrompt={{
        title: "Contacts access",
        message: "We need access to your contacts so you can invite friends.",
      }}
      blockedPrompt={{
        title: "Contacts blocked",
        message: "Enable contacts access for this app in Settings.",
      }}
      renderLimited={(handler) => (
        <View>
          <ContactsList />
          <LimitedUpgradePrompt
            visible
            title="Share more contacts?"
            message="You shared a few contacts. Choose more to find additional friends."
            upgradeLabel="Choose Contacts"
            dismissLabel="Keep current selection"
            onUpgrade={async () => {
              await handler.requestFullAccess();
            }}
            onDismiss={handler.dismissBlocked}
          />
        </View>
      )}
    >
      <ContactsList />
    </PermissionGate>
  );
}

function ContactsList() {
  return <Text>Contacts list goes here</Text>;
}
```

## Using the hook directly

```tsx
function InviteFriendsScreen() {
  const contacts = usePermissionHandler({
    permission: Permissions.CONTACTS,
    prePrompt: { title: "Contacts", message: "Needed to find friends." },
    blockedPrompt: { title: "Blocked", message: "Enable in Settings." },
  });

  if (contacts.isLimited) {
    return (
      <View>
        <ContactsList />
        <Button
          title="Choose Contacts"
          onPress={async () => {
            const next = await contacts.requestFullAccess();
            if (next === "granted") {
              analytics.track("contacts_upgrade_granted");
            }
          }}
        />
      </View>
    );
  }

  if (contacts.isGranted) return <ContactsList />;
  return null;
}
```

## Engine requirements

`requestFullAccess()` on the `Permissions.CONTACTS` permission needs `react-native-permissions`
>= 5.5.3 for the engine to report `limited` accurately (older versions map the same native status
to `granted`) and >= 5.6.0 for `openContactPicker()`, the picker `requestFullAccess()` calls. On
the Expo engine, `expo-contacts` must be installed so `presentAccessPicker()` (or the legacy
`presentAccessPickerAsync()`) is auto-discovered. See the [engines reference](../api/engines.md)
for the full version matrix.

**Gotcha:** the picker resolves as soon as the user dismisses it, whether or not they changed
anything. Don't treat the picker's resolution as proof of an upgrade — `requestFullAccess()`
always re-checks the permission afterward and returns the real status, so branch on its return
value (or the hook's updated `state`), not on the picker call completing.

## Android note

Android has no concept of limited contacts access. `READ_CONTACTS` is an all-or-nothing runtime
permission, so the hook stays in `granted` or `denied` on Android — the `renderLimited` branch
only fires on iOS.

## See also

- [Limited photo access + upgrade](./limited-photo-upgrade.md) — the same `isLimited` +
  `requestFullAccess()` pattern for the iOS 14+ photo library.
- [Engines reference](../api/engines.md) for the full `requestFullAccess` support matrix.
