# Recipe: inline microphone access (voice note composer)

**Problem.** Your chat composer has a mic button. When the user taps it, you want to request
microphone access and start recording as quickly as possible. A full-screen pre-prompt modal feels
clunky for a single button tap — the user's intent is already crystal clear.

**Solution.** Use `skipPrePrompt: "android"` to bypass the pre-prompt on Android only, jumping
straight from `checking` to `requesting`. On iOS, keep the pre-prompt — iOS has a **one-shot**
system dialog, so skipping the warm-up can burn the only chance to ever ask.

## What you'll use

- [`usePermissionHandler`](../api/use-permission-handler.md) — `skipPrePrompt` and `autoCheck`
- Your own inline UI (no default modals needed)

## Code

```tsx
import React, { useEffect } from "react";
import { Button, Text, View } from "react-native";
import { usePermissionHandler } from "react-native-permission-handler";
import { Permissions } from "react-native-permission-handler/rnp";

export function VoiceNoteButton({ onStart }: { onStart: () => void }) {
  const mic = usePermissionHandler({
    permission: Permissions.MICROPHONE,
    autoCheck: false,
    skipPrePrompt: "android",
    // Keep the pre-prompt on iOS — one-shot dialog
    prePrompt: {
      title: "Record voice notes",
      message: "We need microphone access to record and send voice notes.",
    },
    blockedPrompt: {
      title: "Microphone blocked",
      message: "Enable microphone access in Settings to record voice notes.",
    },
  });

  useEffect(() => {
    if (mic.isGranted) onStart();
  }, [mic.isGranted, onStart]);

  if (mic.state === "prePrompt") {
    // iOS only — Android skips straight to requesting
    return (
      <View>
        <Text>Record voice notes?</Text>
        <Button title="Allow microphone" onPress={mic.request} />
        <Button title="Not now" onPress={mic.dismiss} />
      </View>
    );
  }

  if (mic.state === "blockedPrompt") {
    return (
      <View>
        <Text>Microphone is blocked.</Text>
        <Button title="Open Settings" onPress={mic.openSettings} />
      </View>
    );
  }

  return <Button title="Hold to record" onPress={mic.check} />;
}
```

## Flow breakdown

1. The user taps "Hold to record". `autoCheck: false` means nothing has happened yet — the button
   calls `mic.check()` on press.
2. On Android, after `check()` resolves to `denied`, `skipPrePrompt: "android"` fires `request()`
   immediately. The OS dialog pops up directly from the button tap — no modal in between.
3. On iOS, the hook transitions to `prePrompt`, which renders your inline branded explanation. The
   user taps "Allow", which calls `mic.request()` and fires the one-shot system dialog.
4. After `granted`, `isGranted` is `true` and the `useEffect` fires `onStart()`.

## Why not `skipPrePrompt: true` on both platforms?

iOS only shows the system permission dialog **once** in the lifetime of the install. If the user
denies it, it can never be shown again programmatically — the only path forward is Settings. A
pre-prompt acts as a warm-up: the user understands what they're saying yes to, which dramatically
reduces first-time denial rates. `skipPrePrompt: true` (both platforms) is a footgun unless you
have a very specific reason; `"android"` is the safe default for inline composer flows.

## See also

- [`skipPrePrompt` in the API reference](../api/use-permission-handler.md#permissionhandlerconfig)
- [Onboarding wall recipe](./onboarding-wall.md) for the opposite extreme: explicit, sequential,
  pre-prompt-heavy flow.
