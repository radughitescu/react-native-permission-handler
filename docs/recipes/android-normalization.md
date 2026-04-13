# Recipe: Android status normalization

**Problem.** `react-native-permissions` sometimes returns Android permission statuses that don't
match what the user experienced. Three examples from production apps:

1. On Android API < 33, `POST_NOTIFICATIONS` returns `denied` even though notifications are
   effectively granted at runtime (the permission didn't exist pre-Android-13).
2. When the user swipes away the system permission dialog without choosing, some Android versions
   report `blocked` instead of `denied` — causing your app to immediately push a "go to Settings"
   modal even though the user could still be asked again.
3. After the user denies `POST_NOTIFICATIONS` via the system dialog, subsequent `check()` calls
   return `denied` instead of `blocked`, hiding the fact that the user already chose.

**Solution.** Enable `normalizeAndroid: true` when creating the RNP engine. The normalization is
opt-in because it is heuristic-based — apps that have already worked around these quirks manually
should not flip both layers on.

## Enabling

```ts
import { createRNPEngine } from "react-native-permission-handler/rnp";
import { setDefaultEngine } from "react-native-permission-handler";

setDefaultEngine(
  createRNPEngine({
    normalizeAndroid: true,
    normalizePhotoLibrary: true,
  }),
);
```

## What `normalizeAndroid` does

The normalization engine applies three heuristics to every Android `check()` and `request()`:

| Fix | Trigger | Effect |
|-----|---------|--------|
| Pre-Android-13 notifications | `POST_NOTIFICATIONS` + `denied` + API level < 33 | Rewrite to `granted`. Runtime notifications permission didn't exist before API 33, so the OS was effectively always granted. |
| Dialog-dismiss misreport | `request()` returns `blocked` with fewer than 2 prior requests | Rewrite to `denied`. Android only auto-blocks after 2 explicit denials, so an early `blocked` is almost certainly a dismiss. |
| Stale notifications `check` | `POST_NOTIFICATIONS` + `denied` from `check()` + the last `request()` returned `blocked` | Rewrite to `blocked`. The engine caches the last `request()` result and replays it when `check()` lies. |

All three are scoped to Android only — the normalization function is a no-op on iOS.

## What `normalizePhotoLibrary` does

On iOS, the photo library permission occasionally returns `unavailable` in edge cases where the
user could still recover access through Settings (corrupted privacy state after certain iOS
upgrades, or after the user toggles photo library off then on). With
`normalizePhotoLibrary: true`, those `unavailable` results get rewritten to `blocked`, so the
library runs the standard recovery flow (blocked prompt → open Settings → re-check) instead of
treating the permission as permanently dead.

The fix only applies to `PHOTO_LIBRARY` and `PHOTO_LIBRARY_ADD_ONLY`. All other `unavailable`
results stay unchanged.

## When to turn these on

Turn **`normalizeAndroid`** on if:

- You target Android 13+ and want consistent `POST_NOTIFICATIONS` state.
- You've seen "blocked" bug reports from users who just dismissed the dialog once.
- You haven't already written your own Android status workarounds around this library.

Turn **`normalizePhotoLibrary`** on if:

- You've seen users permanently stuck on a photo-picker feature after a clean reinstall.
- You'd rather the blocked-prompt recovery run than the permission disappear.

## When to leave them off

- You maintain your own compatibility layer and don't want two layers fighting.
- You're on an older Android target where the heuristics don't apply.
- You're writing tests that verify raw RNP behavior (inject a `createTestingEngine` instead, see
  the [testing recipe](./testing-with-testing-engine.md)).

## Android 16 hang recovery

Independent of `normalizeAndroid`, the library applies a **5 s default `requestTimeout`** on
Android 16 (API 36+) automatically, routing to `blockedPrompt` with an `onTimeout` callback on
expiry. This recovers from the known `requestPermissions` hang bug; you can override it per-hook
by passing an explicit `requestTimeout` value (including `0` to disable).

See the [`usePermissionHandler` reference](../api/use-permission-handler.md#permissionhandlerconfig)
for details on `requestTimeout` and `onTimeout`.
