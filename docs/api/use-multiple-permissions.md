# `useMultiplePermissions`

Orchestrate several permissions at once. Two strategies:

- **`sequential`** — ask one permission at a time, stop on first denial or block. Ideal for
  onboarding walls where the user should deal with one decision at a time.
- **`parallel`** — check all permissions together, then start prompting each ungranted one
  independently. Ideal for settings screens where permissions are shown as a list.

```tsx
import { useMultiplePermissions } from "react-native-permission-handler";
import { Permissions } from "react-native-permission-handler/rnp";
```

## Signature

```ts
function useMultiplePermissions(config: MultiplePermissionsConfig): MultiplePermissionsResult;
```

## `MultiplePermissionsConfig`

| Field | Type | Description |
|-------|------|-------------|
| `permissions` | `MultiPermissionEntry[]` | One entry per permission. See below. |
| `strategy` | `"sequential" \| "parallel"` | See above. |
| `engine` | `PermissionEngine` | Optional — overrides the default engine for this hook. |
| `autoCheck` | `boolean` | Default `true`. Initial check on mount without running the full flow. |
| `requestTimeout` | `number` | Per-request timeout. Android 16 auto-applies 5 s. |
| `onTimeout` | `() => void` | Fires if any individual request times out. |
| `debug` | `boolean \| (msg: string) => void` | Same semantics as `usePermissionHandler`. |
| `onAllGranted` | `() => void` | Fires when every entry is `granted` or `limited`. |

### `MultiPermissionEntry`

| Field | Type | Description |
|-------|------|-------------|
| `permission` | `string` | Engine-specific identifier (or `Permissions.*`). |
| `id` | `string` | Optional stable key for `statuses` / `handlers`. When omitted, `permission` is used. Essential when the underlying permission string differs per platform (`Permissions.CAMERA` resolves differently on iOS vs Android) — pass a stable `id` like `"camera"` to render platform-agnostic rows. |
| `prePrompt` | `PrePromptConfig` | Required for this entry. |
| `blockedPrompt` | `BlockedPromptConfig` | Required for this entry. |
| `onGrant` / `onDeny` / `onBlock` / `onSettingsReturn` | callbacks | Fire for this entry only. |

## `MultiplePermissionsResult`

| Field | Type | Description |
|-------|------|-------------|
| `statuses` | `Record<string, PermissionFlowState>` | Keyed by `id` or permission string. |
| `allGranted` | `boolean` | `true` when every entry is `granted` or `limited`. |
| `handlers` | `Record<string, MultiPermissionHandler>` | Per-entry `{ state, request, dismiss, dismissBlocked, openSettings }`. Use these to drive per-row UI. |
| `activePermission` | `string \| null` | The current key being prompted. Non-null only while a flow is in progress. |
| `blockedPermissions` | `string[]` | Keys currently in a blocked state. Useful for showing a "fix these in Settings" summary. |
| `request()` | `() => void` | Start the multi-permission flow (checks all, then prompts ungranted ones). |
| `reset()` | `() => void` | Reset all entries to `idle`. |
| `resume()` | `() => void` | Sequential only: rebuild the pending queue from entries that are not `granted`/`limited` and restart. Use after the user comes back from Settings for one blocked permission to continue with the rest. No-op in parallel mode. |

## Sequential example (video call)

```tsx
import { useMultiplePermissions } from "react-native-permission-handler";
import { Permissions } from "react-native-permission-handler/rnp";

export function VideoCallScreen() {
  const perms = useMultiplePermissions({
    strategy: "sequential",
    permissions: [
      {
        id: "camera",
        permission: Permissions.CAMERA,
        prePrompt: { title: "Camera", message: "Needed so your friends can see you." },
        blockedPrompt: { title: "Camera blocked", message: "Enable in Settings." },
      },
      {
        id: "microphone",
        permission: Permissions.MICROPHONE,
        prePrompt: { title: "Microphone", message: "Needed so your friends can hear you." },
        blockedPrompt: { title: "Mic blocked", message: "Enable in Settings." },
      },
    ],
    onAllGranted: () => startCall(),
  });

  if (perms.allGranted) return <CallUI />;
  return <Button title="Start call" onPress={perms.request} />;
}
```

## Parallel example (settings screen)

```tsx
const perms = useMultiplePermissions({
  strategy: "parallel",
  permissions: [
    { id: "notifications", permission: "notifications", prePrompt, blockedPrompt },
    { id: "location",      permission: Permissions.LOCATION_WHEN_IN_USE, prePrompt, blockedPrompt },
  ],
});

return (
  <View>
    <PermissionRow
      label="Notifications"
      handler={perms.handlers.notifications}
    />
    <PermissionRow
      label="Location"
      handler={perms.handlers.location}
    />
    {perms.blockedPermissions.length > 0 && (
      <Text>Some permissions need attention in Settings.</Text>
    )}
  </View>
);
```

## Notes

- Duplicate entry keys (colliding `id`s, or two entries sharing a permission string without `id`)
  emit a development-mode warning and cause clobbered status rows — always set `id` when entries
  might collide.
- In sequential mode, dismissing a pre-prompt or blocked prompt stops the flow. Use `resume()` to
  continue after the user takes some explicit action.
- See the [onboarding-wall recipe](../recipes/onboarding-wall.md) for a full sequential-with-resume
  example.
