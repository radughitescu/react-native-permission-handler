# `PermissionGate` and default prompts

Declarative wrapper that renders its children only when a permission is granted. Internally uses
`usePermissionHandler`, so all platform handling, state machine behavior, and settings-return
re-checking are identical.

```tsx
import { PermissionGate } from "react-native-permission-handler";
import { Permissions } from "react-native-permission-handler/rnp";
```

## Minimal example

```tsx
<PermissionGate
  permission={Permissions.CAMERA}
  prePrompt={{ title: "Camera", message: "We need your camera to scan QR codes." }}
  blockedPrompt={{ title: "Blocked", message: "Enable camera in Settings." }}
  fallback={<Spinner />}
>
  <QRScanner />
</PermissionGate>
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `permission` | `string` | Engine-specific identifier. |
| `engine` | `PermissionEngine` | Optional — per-gate engine override. |
| `prePrompt` | `PrePromptConfig` | Title/message for the default pre-prompt. Required if you rely on default rendering. |
| `blockedPrompt` | `BlockedPromptConfig` | Title/message for the default blocked prompt. |
| `children` | `ReactNode` | Rendered when `isGranted` is `true` (granted **or** limited). |
| `fallback` | `ReactNode` | Rendered while checking, unavailable, denied (if no `renderDenied`), or in any state without a dedicated render prop. Defaults to `null`. |
| `onGrant` | `() => void` | Fires on transitions into `granted` or `limited`. |
| `onDeny` | `() => void` | Fires on deny. |
| `onBlock` | `() => void` | Fires on block. |
| `onSettingsReturn` | `(granted: boolean) => void` | Fires after the Settings round-trip. |
| `renderPrePrompt` | `(props) => ReactNode` | Replace the default pre-prompt modal with your own UI. |
| `renderBlockedPrompt` | `(props) => ReactNode` | Replace the default blocked modal. |
| `renderDenied` | `(props) => ReactNode` | Render something after the user explicitly dismisses the pre-prompt. Receives `{ check }` so you can offer a "try again" affordance. |
| `renderLimited` | `(result: PermissionHandlerResult) => ReactNode` | Render custom UI while the permission is in the `limited` state (iOS 14+ partial photo access). Receives the full handler so you can call `requestFullAccess()` from inside the rendered UI. **Note:** `handler.requestFullAccess()` is only supported on the Expo engine today — the RNP engine throws (see [`usePermissionHandler` reference](./use-permission-handler.md#permissionhandlerresult)). When omitted, the gate falls through to `children` (backward compatible with v0.6.0). |

### Render prop payloads

```ts
renderPrePrompt: (props: {
  config: PrePromptConfig;
  onConfirm: () => void;
  onCancel: () => void;
}) => ReactNode;

renderBlockedPrompt: (props: {
  config: BlockedPromptConfig;
  onOpenSettings: () => void;
  onDismiss: () => void;
}) => ReactNode;

renderDenied: (props: { check: () => void }) => ReactNode;

renderLimited: (result: PermissionHandlerResult) => ReactNode;
```

## Custom UI example

```tsx
<PermissionGate
  permission={Permissions.PHOTO_LIBRARY}
  prePrompt={{ title: "Photos", message: "We need access to upload a profile picture." }}
  blockedPrompt={{ title: "Blocked", message: "Enable photo access in Settings." }}
  renderPrePrompt={({ config, onConfirm, onCancel }) => (
    <BrandedModal title={config.title} body={config.message} onAllow={onConfirm} onSkip={onCancel} />
  )}
  renderDenied={({ check }) => (
    <View>
      <Text>Photos are optional but recommended.</Text>
      <Button title="Try again" onPress={check} />
    </View>
  )}
  renderLimited={(handler) => (
    <PhotoPicker onUpgrade={() => handler.requestFullAccess()} />
  )}
>
  <PhotoPickerGranted />
</PermissionGate>
```

## Default prompts

The default modals are also exported so you can reuse their look with custom behavior.

```tsx
import {
  DefaultPrePrompt,
  DefaultBlockedPrompt,
  LimitedUpgradePrompt,
} from "react-native-permission-handler";
```

All three use only React Native primitives (`Modal`, `View`, `Text`, `TouchableOpacity`) — no
third-party UI dependencies.

```tsx
<LimitedUpgradePrompt
  visible
  title="Allow full photo access"
  message="You gave access to a few photos. You can allow full access anytime."
  upgradeLabel="Allow Full Access"
  dismissLabel="Keep current selection"
  onUpgrade={handleUpgrade}
  onDismiss={handleDismiss}
/>
```

See the [limited-photo recipe](../recipes/limited-photo-upgrade.md) for a complete upgrade flow.

## Notes

- If `renderLimited` is not set, `limited` falls through to `children` — useful when
  limited access is functionally equivalent to granted for your feature.
- `PermissionGate` is a thin wrapper — if you need finer control (manual check, reset, etc.), drop
  down to [`usePermissionHandler`](./use-permission-handler.md).
