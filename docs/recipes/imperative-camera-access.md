# Recipe: imperative camera access (button-triggered flows)

**Problem.** Your user is mid-form. It might be a multi-step KYC flow with ID capture, a profile
editor with an avatar picker, or a payment onboarding that wants a selfie at step 3. The next
tap is "Take photo." Wrapping the whole form in `<PermissionGate>` would unmount the children on
a denied/blocked state and lose every entered field. The permission request has to be
button-triggered, inline, and *must not* unmount the surrounding form.

**Solution.** Use `usePermissionHandler` directly instead of `<PermissionGate>`. Trigger
`request()` from the button's `onPress`. Supply custom UI via `renderPrePrompt` and
`renderBlockedPrompt`, then render the hook's computed `ui` field as a sibling of the form — not
a wrapper. Denials, blocked-prompts, and Settings round-trips all flow through without ever
unmounting the form state.

## What you'll use

- [`usePermissionHandler`](../api/use-permission-handler.md) — `request`, `ui`, `renderPrePrompt`,
  `renderBlockedPrompt`, `isGranted`
- [`PermissionGate`](../api/permission-gate.md) — for contrast (and the "when to use it instead"
  note below)

## Code

```tsx
import React, { useState } from "react";
import { Button, Modal, Text, View } from "react-native";
import { usePermissionHandler } from "react-native-permission-handler";
import { Permissions } from "react-native-permission-handler/rnp";

export function KycIdCaptureStep() {
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");

  const camera = usePermissionHandler({
    permission: Permissions.CAMERA,
    autoCheck: false,
    blockedPrompt: {
      title: "Camera blocked",
      message:
        "To verify your identity, allow camera access. Tap Settings, then Camera to enable it.",
    },
    renderBlockedPrompt: ({ config, onOpenSettings, onDismiss }) => (
      <Modal visible transparent animationType="fade">
        <View>
          <Text>{config.title}</Text>
          <Text>{config.message}</Text>
          <Button title="Open Settings" onPress={onOpenSettings} />
          <Button title="Not now" onPress={onDismiss} />
        </View>
      </Modal>
    ),
  });

  return (
    <View>
      <KycForm
        fullName={fullName}
        dob={dob}
        onChangeFullName={setFullName}
        onChangeDob={setDob}
      />

      {camera.isGranted ? (
        <CameraCapture />
      ) : (
        <Button title="Scan ID" onPress={camera.request} />
      )}

      {camera.ui}
    </View>
  );
}

function KycForm(_: {
  fullName: string;
  dob: string;
  onChangeFullName: (v: string) => void;
  onChangeDob: (v: string) => void;
}) {
  return <Text>Form fields go here</Text>;
}

function CameraCapture() {
  return <Text>Camera preview and capture button</Text>;
}
```

## Why not `<PermissionGate>`

`PermissionGate` is a declarative wrapper: it owns the mount lifecycle of its children and will
unmount them whenever the permission flow leaves `granted`. That's the right trade-off for
one-screen flows (QR scanner, onboarding wall, full-screen camera), where losing children state
on denial is acceptable because there's nothing to lose. It's the wrong trade-off for mid-form
state, where the user has invested effort and a remount means silently erasing their work.

The imperative hook API lets you keep the form mounted across every transition. The permission
UI renders as a sibling (via `{camera.ui}`), not a wrapper, and the `<CameraCapture>` branch is
just a conditional inside the form tree.

## Contextual consent — skip the pre-prompt?

The standard advice is "always pre-prompt on iOS because the system dialog is one-shot." But
there's a specific case where skipping it is defensible: when the user has explicitly tapped a
button that makes the intent obvious ("Scan ID", "Add photo", "Take selfie"), the button tap *is*
the contextual consent. Apple's Human Interface Guidelines endorse requesting permissions in
context at the moment the feature is needed, and a JS pre-prompt layered on top of a deliberate
button tap is redundant friction.

The recipe above omits `renderPrePrompt` entirely, so the pre-prompt state is skipped — the flow
goes `idle → checking → requesting` on the button tap, and the system dialog fires directly.
This is safe **only** because the button tap is the contextual trigger. If your flow might
trigger a first request without an explicit user action (e.g. on screen mount, inside a
`useEffect`), put the pre-prompt back — iOS only gives you one shot at the system dialog and you
want the user warmed up first.

## After denial

If the user denies the permission, the hook transitions to `denied`. Your "Scan ID" button still
renders (because `isGranted` is false), and a second tap calls `request()` again. On Android the
system dialog fires again (Android allows two attempts). On iOS the one-shot system dialog is
spent, so the hook transitions to `blockedPrompt` and `{camera.ui}` renders the
`renderBlockedPrompt` modal with an "Open Settings" button.

One thing worth flagging in the blocked-prompt copy: on iOS,
`UIApplication.openSettingsURLString` lands on the app's settings page — there is no deeper
deep-link to the specific permission row, and no library can work around that. Tell the user
exactly where to tap: "Tap Settings, then Camera to enable it." Users genuinely get stuck on
the Settings page if you don't.

## `NSCameraUsageDescription` for KYC apps

Not library-specific, but worth knowing before you ship: App Review rejects vague
`NSCameraUsageDescription` strings for financial or identity-verification apps. "We use your
camera" fails. "To capture your ID document for identity verification" passes. If you're building
a KYC flow, be explicit about the purpose in the Info.plist string; the blocked-prompt copy in
your app can be shorter because the user already has context from the button.

## When `<PermissionGate>` is still the right answer

Use `<PermissionGate>` when:

- The permission is a prerequisite for the whole screen (QR scanner, full-screen camera, map
  view).
- There's no form state to lose on denial.
- Onboarding flows where denying the permission should kick the user out of the step anyway.
  See the [onboarding wall recipe](./onboarding-wall.md) for the gate-based pattern.

Reach for the imperative hook API when the permission request is one affordance among many on a
screen — a button inside a form, a tappable avatar, a "Scan receipt" action inside a list.

## See also

- [Voice note composer](./voice-note-composer.md) — the microphone version of this exact pattern
  with a different trade-off (`skipPrePrompt: "android"` for inline mic buttons).
- [Onboarding wall](./onboarding-wall.md) — the declarative, `PermissionGate`-based contrast.
- [Limited photo access + upgrade](./limited-photo-upgrade.md) — if your KYC flow offers
  "upload existing ID" as a fallback when camera is denied, this recipe chains cleanly with
  photo library permissions.
