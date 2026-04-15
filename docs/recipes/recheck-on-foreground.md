# Recipe: re-check permission on app foreground

**Problem.** Your user grants camera access inside your app, backgrounds to iOS/Android Settings,
toggles camera off **outside your blocked-prompt flow**, and returns to your app. Your hook still
reports `granted` — the state is stale until the next explicit `check()` call.

**Solution.** Enable `recheckOnForeground: true` on `usePermissionHandler`. Every
`background → active` AppState transition triggers a fresh `engine.check()` that reactively
updates the hook's state.

## What you'll use

- [`usePermissionHandler`](../api/use-permission-handler.md) with `recheckOnForeground: true`
- The hook handles the AppState listener, generation counter, and settings-return precedence
  for you — you just opt in.

## Semantics (the part the API table doesn't spell out)

When `recheckOnForeground` is `true`, the hook runs `check()` on every `background → active`
transition **except** when a recheck from the library's own `openSettings()` path is already
scheduled — the Settings-return recheck takes precedence so you don't double-check on the same
transition.

The state update is reactive: if the engine returns a different status, the state machine
advances via `CHECK_RESULT`, the React state updates, and your component re-renders. If the
status is unchanged, no state transition happens and no re-render is triggered (the state
machine's `CHECK_RESULT` handler returns the same state).

**AppState blip handling.** iOS and Android briefly emit `inactive` / `background` during
system UI overlays (Control Center, Share Sheet, biometric prompts). Each blip that returns to
`active` triggers a recheck, but because unchanged statuses don't propagate, the user never sees
a flash of stale UI. The cost is one extra `engine.check()` call per blip — acceptable for
development flows, benign for production.

## Minimal example

```tsx
import { usePermissionHandler } from "react-native-permission-handler";
import { Permissions } from "react-native-permission-handler/rnp";

function QRScanner() {
  const camera = usePermissionHandler({
    permission: Permissions.CAMERA,
    recheckOnForeground: true,
    prePrompt: { title: "Camera", message: "Scan QR codes to join." },
    blockedPrompt: {
      title: "Camera blocked",
      message: "Enable camera access in Settings.",
    },
  });

  // If the user toggles camera off in system Settings while backgrounded,
  // this component re-renders on return with camera.state === "blockedPrompt"
  // (or "denied") automatically — no manual check() required.

  if (camera.isGranted) return <Scanner />;
  return <CameraGate handler={camera} />;
}
```

## When to enable it

- **Rideshare / delivery / fitness** — users toggle location permissions in Settings often and
  expect the app to notice immediately.
- **KYC / onboarding flows** — a user who grants mid-onboarding, backgrounds to check a message,
  and returns should see the flow continue without a stale denied state.
- **Long-lived screens** — any screen the user keeps mounted for minutes at a time, during
  which they might toggle permissions in Settings.

## When to leave it disabled

- **Short imperative flows** (a voice-note button in a chat composer) — the user is on-screen
  for seconds, not minutes; `check()` on mount is enough.
- **Screens that don't render permission-gated UI** — if the permission doesn't block anything
  visible, skip the overhead.
- **When Settings-return recheck is sufficient** — if your flow always goes through
  `handler.openSettings()` to recover blocked state, the default path already re-checks on
  return.

## Interaction with `refresh()`

`recheckOnForeground` and [`refresh()`](../api/use-permission-handler.md#permissionhandlerresult)
address different problems:

- **`recheckOnForeground`** — detects *external* permission changes (user flipped a toggle in
  Settings) automatically on resume.
- **`refresh()`** — detects *corrupted grants* (iOS 18 camera blackout) that require a native
  re-request. Developer-invoked, not automatic.

Use both when you need belt-and-braces recovery: the former for "user changed their mind," the
latter for "the OS silently broke our grant."

## See also

- [`recheckOnForeground` config row](../api/use-permission-handler.md#permissionhandlerconfig)
- [Stale permission state](./stale-permission-state.md) — specifically the Expo cold-start bug
  this recipe mitigates.
