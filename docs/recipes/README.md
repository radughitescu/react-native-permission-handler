# Recipes

End-to-end solutions to real problems. Each recipe is a copy-pasteable file you can drop into a
React Native app. Cross-links point to the [API reference](../api/README.md) for deeper details.

## UX flows

- [Limited photo access + upgrade](./limited-photo-upgrade.md) — iOS 14+ partial photo access,
  detect with `isLimited`, upgrade with `requestFullAccess()` and `renderLimited`.
- [Onboarding permission wall](./onboarding-wall.md) — sequential multi-permission flow with
  stable `id` keys and `resume()` for settings round-trips.
- [Voice note composer](./voice-note-composer.md) — inline microphone access using
  `skipPrePrompt: "android"`.

## Platform-specific bundles

- [Background location](./background-location.md) — foreground → background location using
  `Permissions.BUNDLES.LOCATION_BACKGROUND`.
- [Bluetooth device pairing](./ble-device-pairing.md) — BLE pairing using
  `Permissions.BUNDLES.BLUETOOTH`.

## Reliability and testing

- [Recheck on foreground](./recheck-on-foreground.md) — auto-detect permission changes made in
  system Settings outside your blocked-prompt flow (`recheckOnForeground: true`).
- [Stale permission state](./stale-permission-state.md) — work around Expo's cold-start stale
  `undetermined` bug ([expo/expo#42084](https://github.com/expo/expo/issues/42084)).
- [Android status normalization](./android-normalization.md) — when and why to enable
  `normalizeAndroid` and `normalizePhotoLibrary`.
- [Testing with `createTestingEngine`](./testing-with-testing-engine.md) — unit-testing components
  and hooks that use this library.
