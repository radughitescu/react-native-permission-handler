# Changelog

## 0.9.0 — 2026-08-18

The **Limited-Access Upgrades & Full Library Access** release. `requestFullAccess()` is now first-class across all three engines (RNP via native pickers, Expo via auto-discovered modules, testing engine for test suites). Expo engine detects iOS limited-access states from both the literal `limited` status and the `accessPrivileges: "limited"` field. New recipes for iOS 18 limited contacts and location always-allow upgrades.

All changes are additive. Existing v0.8.2 code continues to work.

### New features

- **`requestFullAccess()` on RNP engine** — photo library via `openPhotoPicker` (iOS 14+,
  `react-native-permissions` >=5.5.1) and contacts via `openContactPicker` (iOS 18+, >=5.6.0).
  Permission strings unsupported by a specific picker throw at call time with a clear error
  message. Missing RNP version for the requested picker throws a descriptive error naming the
  required version and the missing export (e.g. "contactPicker requires react-native-permissions
  >=5.6.0"). RNP and the calling permission are re-checked after the picker resolves.
- **`requestFullAccess()` on Expo engine** — auto-discovers installed pickers: `expo-media-library`
  (`presentPermissionsPicker` on newer versions, fallback `presentPermissionsPickerAsync`) for
  `mediaLibrary` and `imagePickerMediaLibrary` keys, and `expo-contacts` (`presentAccessPicker`
  / fallback `presentAccessPickerAsync`) for `contacts`. The new
  `ExpoEngineConfig.fullAccessPickers` field overrides auto-discovery when needed. Expo re-checks
  status after picker resolution.
- **Limited-access detection in Expo engine** — both the literal `limited` status from
  `requestPermissions()` and the `accessPrivileges: "limited"` field (iOS 14+) now correctly map
  to the `limited` PermissionStatus. Enables iOS 14+ limited-access workflows on Expo.
- **`requestFullAccess()` on testing engine** — simulated via the `TestingEngine` instance
  option `fullAccessResult` (defaults to `"granted"`). Call history includes a `"requestFullAccess"`
  entry (no payload). Allows test suites to simulate full-access picker flows without a native
  environment.
- **New recipes** — iOS 18 limited contacts upgrade via `requestFullAccess()` and location
  when-in-use→always upgrade via `openSettings("location")` deep-link.

### Changes

- **`usePermissionHandler().requestFullAccess` error messages** — now reflect which engines
  support the permission. Unsupported-permission errors include a hint (e.g. "photos are only
  available on the RNP engine").
- **devDependency `react-native-permissions`** raised to `5.6.1` (peer range unchanged at
  `>=4.0.0`). Supports iOS 18 Contacts framework `PHPhotoLibrary.presentLimitedLibraryPicker` and
  `CNContactStore.presentContactPickerViewController()` bindings for the new pickers.

### Non-breaking

All changes are additive. Engines that don't implement `requestFullAccess()` or limited-access
detection continue to return a clear error or the granted status respectively. Existing code
using `check()`, `request()`, and `openSettings()` is unaffected.

---

## 0.8.2 — 2026-04-15

Documentation-only patch. No runtime changes.

### Documentation

- Added recipe: **Imperative camera access** — button-triggered permission flows inside a mid-form
  context (KYC, ID capture, profile photos) that must survive denial without unmounting form
  state. Uses `usePermissionHandler` directly with `renderPrePrompt`/`renderBlockedPrompt` render
  props and the `ui` field as a sibling of the form.
- Added recipe: **Location accuracy UI** — render precise vs approximate map and ETA from
  `result.metadata.locationAccuracy` on iOS 14+ (Expo engine), paired with `recheckOnForeground`
  so the UI recovers when the user toggles Precise Location in Settings.

## 0.8.1 — 2026-04-15

Small follow-up patch. Surfaces the Expo location-accuracy metadata on the hook result that
v0.8.0 only captured internally, plus two documentation additions from post-release feedback.

### New features

- **`PermissionHandlerResult.metadata`** — engine-specific metadata snapshot, populated when the
  resolved engine implements the optional new `PermissionEngine.getMetadata()` method. Currently
  only the Expo engine populates a field: `metadata.locationAccuracy` is `"full"` or `"reduced"`
  on iOS 14+ after a location permission call via Expo SDK 55+. The field shape is intentionally
  tight — new fields are added only when a concrete engine + use case justifies them.

### Docs

- New recipe: [speech-recognition](./docs/recipes/speech-recognition.md) — iOS needs both
  `MICROPHONE` and `SPEECH_RECOGNITION`; Android needs only `RECORD_AUDIO`. Platform-aware
  sequential flow with stable `id` keys.
- README: new **App Tracking Transparency timing gotcha** in the iOS Platform gotchas section.
  ATT can only be requested while the app is in the `.active` state; calling it from a
  cold-start mount effect silently returns `denied`. Rule of thumb included.

### Non-breaking

All changes are additive. `PermissionEngine.getMetadata` is optional — engines that don't
implement it continue to work (the hook returns an empty `metadata` object). Existing code
destructuring `PermissionHandlerResult` is unaffected.

---

## 0.8.0 — 2026-04-15

The **Permission Recovery & State Reliability** release. Every v0.7.0-era recovery path is now
first-class: openSettings deep-links to the per-permission sub-page on iOS, state updates
reactively when the user toggles permissions outside your flow, imperative flows get
render-prop ergonomics, and there's a new `refresh()` escape hatch for corrupted grants.

All changes are additive. Existing v0.7.0 code continues to work.

### New features

- **`refresh()`** on `PermissionHandlerResult` — force a fresh `engine.request()` bypassing
  `check()`. Use this when the native status reports `granted` but the permission is
  functionally broken (e.g. iOS 18 camera/photo corrupted-grant bug). From terminal states
  (`granted`, `limited`, `denied`, `blocked`, `unavailable`) transitions to `requesting` and
  re-runs the native dialog. From non-terminal states it's a no-op. Backed by a new `REFRESH`
  event in the state machine.
- **`engine.openSettings(permission?)`** — optional permission parameter enables best-effort
  iOS Settings deep-linking via the unofficial `App-Prefs:` URL scheme. Supports camera,
  microphone, photos, location, contacts, calendars, reminders, motion, and Bluetooth, with
  substring matching that accepts RNP constants, Expo keys, and plain strings. Falls back to
  generic Settings when the deep-link fails. `usePermissionHandler` and `useMultiplePermissions`
  pass their configured permission automatically — no call-site changes required.
- **`renderPrePrompt` / `renderBlockedPrompt`** on `PermissionHandlerConfig` — imperative
  hook-driven flows (KYC camera, inline composers, button-driven flows) can now use render-prop
  ergonomics without wrapping in `PermissionGate`. The hook result exposes a computed `ui` node
  that renders the matching function for the current state, or `null` otherwise. Bare-hook users
  can render `{handler.ui}` inline in their layout.
- **`createExpoEngine`** now reads the `ios.accuracy` field from `expo-location` responses
  (Expo SDK 55+) and exposes it via a new `getLastLocationAccuracy()` method on the `ExpoEngine`
  type. Not yet surfaced on `PermissionHandlerResult` — that's a v0.9.0 design topic.

### Fixes

- **State machine:** `REQUEST_RESULT:unavailable` and `RECHECK_RESULT:unavailable` now transition
  to the terminal `unavailable` state. Previously the default case left the flow stuck in
  `requesting` or `recheckingAfterSettings` indefinitely — a latent freeze that no test covered.

### Docs

- New recipe: [recheck-on-foreground](./docs/recipes/recheck-on-foreground.md) — full semantics,
  blip handling, and guidance on when to enable `recheckOnForeground: true`.
- New recipe: [stale-permission-state](./docs/recipes/stale-permission-state.md) — workaround
  for the Expo cold-start stale-`undetermined` bug
  ([expo/expo#42084](https://github.com/expo/expo/issues/42084)).
- Updated recipe: [background-location](./docs/recipes/background-location.md) now documents the
  iOS "Always Allow" upgrade path via `openSettings("location")` deep-link.
- New guide: [iOS Privacy Manifest](./docs/guides/ios-privacy-manifest.md) — `PrivacyInfo.xcprivacy`
  boilerplate template and full `Info.plist` usage-description reference.
- README: new "What this library doesn't cover" section disclaiming HealthKit, OAuth scopes, IAP
  entitlements, push provider tokens, etc.
- Types: clarified `"limited"` status scope and the iOS 18 limited-contacts caveat.

### Non-breaking

All changes are additive. `PermissionHandlerResult.refresh` and `.ui` are new fields; existing
code that destructures the result continues to work. `PermissionEngine.openSettings` gained an
optional parameter; engines that don't implement it still work. `createExpoEngine` now returns
the `ExpoEngine` type (extends `PermissionEngine`) — existing code typed against
`PermissionEngine` is unaffected.

---

## 0.7.0

See the git history for the v0.7.0 changes. Highlights:

- Android post-dialog status normalization (opt-in via `createRNPEngine({ normalizeAndroid })`)
- `requestFullAccess()` wired through the hook and `renderLimited` on `PermissionGate`
- `Permissions.BUNDLES` for BLE, LOCATION_BACKGROUND, and CALENDARS_WRITE_ONLY
- `skipPrePrompt: true | "android"` for one-tap composer flows
- `useMultiplePermissions.resume()` to continue a stopped sequential flow
- Optional `prePrompt` / `blockedPrompt` config
- Android 16 `request()` hang auto-recovery via 5 s default `requestTimeout`
- Photo library `unavailable → blocked` engine normalization
- Wired `recheckOnForeground` config option
- Platform-aware `LOCATION_BACKGROUND` bundle (iOS single-authorization, Android two entries)
- `createTestingEngine` symmetric defaults + `autoGrantUnset` opt-in
- `allGranted` false on empty permission arrays
