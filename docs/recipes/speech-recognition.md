# Recipe: speech recognition (mic + speech recognition together)

**Problem.** iOS speech-to-text (via `SFSpeechRecognizer`) needs **two** permissions: the
microphone (to capture audio) **and** speech recognition (to send that audio to Apple's STT
service). Developers commonly ship only one of them — `SPEECH_RECOGNITION` alone fails silently
because the mic isn't authorized, or `MICROPHONE` alone works for recording but returns no
transcription. Both must be granted before the feature works.

Android is the opposite: there is no separate speech-recognition permission — `RECORD_AUDIO` is
all you need. So the code path has to be platform-aware: request two permissions on iOS, one on
Android.

**Solution.** Use `useMultiplePermissions` with a platform-computed `permissions` array, stable
`id` keys so the UI rows don't depend on platform-specific permission strings, and
`strategy: "sequential"` so the user sees the mic prompt first (the most intuitive ask) and then
the speech-recognition prompt.

## What you'll use

- [`useMultiplePermissions`](../api/use-multiple-permissions.md) with `strategy: "sequential"`
- `Permissions.MICROPHONE` and `Permissions.SPEECH_RECOGNITION` from `react-native-permission-handler/rnp`
- Platform.OS branching to skip the speech-recognition entry on Android

## Code

```tsx
import React from "react";
import { Platform, Text, View } from "react-native";
import {
  type MultiPermissionEntry,
  useMultiplePermissions,
} from "react-native-permission-handler";
import { Permissions } from "react-native-permission-handler/rnp";

// iOS needs both permissions; Android needs only the mic (RECORD_AUDIO).
const speechEntries: MultiPermissionEntry[] = [
  {
    id: "microphone",
    permission: Permissions.MICROPHONE,
    prePrompt: {
      title: "Microphone access",
      message: "We record your voice to transcribe it in real time.",
    },
    blockedPrompt: {
      title: "Microphone blocked",
      message: "Enable microphone access in Settings to use voice input.",
    },
  },
  ...(Platform.OS === "ios"
    ? [
        {
          id: "speech-recognition",
          permission: Permissions.SPEECH_RECOGNITION,
          prePrompt: {
            title: "Speech recognition",
            message:
              "We send your recording to Apple's speech service to turn it into text.",
          },
          blockedPrompt: {
            title: "Speech recognition blocked",
            message: "Enable Speech Recognition in Settings to transcribe voice.",
          },
        } satisfies MultiPermissionEntry,
      ]
    : []),
];

export function VoiceTranscriptionScreen() {
  const perms = useMultiplePermissions({
    strategy: "sequential",
    permissions: speechEntries,
    onAllGranted: () => console.log("ready to transcribe"),
  });

  const active = perms.activePermission;
  const activeHandler = active ? perms.handlers[active] : null;

  if (perms.allGranted) return <Transcriber />;

  return (
    <View>
      <Text>To transcribe speech we need your microphone{Platform.OS === "ios" ? " and speech-recognition access" : ""}.</Text>
      {!active && (
        <Button title="Grant access" onPress={perms.request} />
      )}
      {activeHandler?.state === "prePrompt" && (
        <Button title="Continue" onPress={activeHandler.request} />
      )}
      {activeHandler?.state === "blockedPrompt" && (
        <Button title="Open Settings" onPress={activeHandler.openSettings} />
      )}
    </View>
  );
}

function Transcriber() {
  return <Text>Recording...</Text>;
}

function Button({ title, onPress }: { title: string; onPress: () => void }) {
  return <Text onPress={onPress}>{title}</Text>;
}
```

## Why sequential, not parallel

Both iOS prompts share the same modal style and fire back-to-back. Parallel would trigger both
system dialogs simultaneously, which iOS actually handles gracefully (they queue), but the UX is
jarring — the user sees "Allow microphone access?" and before they decide, a second dialog stack
builds up. Sequential keeps the flow calm: mic first, explain speech-recognition after they
approve the mic.

Also, if the user denies the microphone, there is zero value in still prompting for speech
recognition. Sequential stops the flow automatically on the first denial.

## Why `id` keys, not the permission string

`Permissions.MICROPHONE` resolves to `ios.permission.MICROPHONE` on iOS and
`android.permission.RECORD_AUDIO` on Android. If you key `perms.statuses` / `perms.handlers` by
the raw permission string, your UI code has to `Platform.select` every row. The `id` field lets
you write `perms.handlers.microphone` once and have it work on both platforms. The same applies
to the iOS-only speech-recognition entry — `perms.handlers["speech-recognition"]` is `undefined`
on Android, not a crash.

## Info.plist / usage descriptions

iOS requires two usage-description strings in `Info.plist`:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>We use the microphone to capture your voice for transcription.</string>
<key>NSSpeechRecognitionUsageDescription</key>
<string>We transcribe your voice using Apple's speech recognition service.</string>
```

See the [iOS Privacy Manifest guide](../guides/ios-privacy-manifest.md) for the full list of
permission usage-description keys.

## See also

- [Types — `Permissions`](../api/types.md#permissions) for the full constant list.
- [Onboarding wall recipe](./onboarding-wall.md) for the general sequential-multi-permission
  pattern with `resume()` after Settings round-trips.
- [Voice note composer recipe](./voice-note-composer.md) for the *single-permission* inline mic
  pattern using `skipPrePrompt: "android"`.
