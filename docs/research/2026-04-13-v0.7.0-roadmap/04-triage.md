# Library Advocate Triage

Triage of every distinct pain point and friction item across the three Phase 1 research files against the current v0.6.0 codebase. Each entry tags one of four categories:

- **already-solved** — v0.6.0 has a real, shipping API that handles this. (Undocumented features do NOT qualify — they are DX problems.)
- **solvable-in-current-arch** — no new primitives needed; a hook/component/engine tweak or docs work lands it.
- **needs-new-primitive** — requires a new type, hook, engine method, state, or event in the state machine.
- **out-of-scope** — wrong layer, platform limitation, or domain the library shouldn't chase.

## Summary (count per category)

- **already-solved:** 10
- **solvable-in-current-arch:** 24
- **needs-new-primitive:** 8
- **out-of-scope:** 7
- **Total entries triaged:** 49 (23 Unsolved + 10 Solved Poorly + 7 "Already Solved By Us" from file 02 + 5 friction themes from file 03 + 4 cross-cutting observations from file 01 with actionable intent)

---

## Already Solved

### Pre-prompt UX before the system dialog
- **Source:** 02-pain-points.md "Already Solved By Us #1"; also Solved-Poorly #1 (RNP `rationale` is Android-only).
- **Category:** already-solved
- **Evidence:** `DefaultPrePrompt` component + `PrePromptConfig` type (`src/types.ts:53`), wired into both `usePermissionHandler` (`src/hooks/use-permission-handler.ts:61`, PRE_PROMPT_CONFIRM transition) and `PermissionGate` (`src/components/permission-gate.tsx:74`). State machine has explicit `prePrompt` state with `PRE_PROMPT_CONFIRM` / `PRE_PROMPT_DISMISS` transitions (`src/core/state-machine.ts:33`).
- **Effort:** —

### Blocked recovery via Settings deep-link
- **Source:** 02-pain-points.md "Already Solved By Us #2"; Solved-Poorly #2.
- **Category:** already-solved
- **Evidence:** `DefaultBlockedPrompt` + `goToSettings` callback in `usePermissionHandler` (`src/hooks/use-permission-handler.ts:109`) transitioning through `blockedPrompt → openingSettings → recheckingAfterSettings`. Engine interface mandates `openSettings()`.
- **Effort:** —

### AppState re-check only after explicit openSettings()
- **Source:** 02-pain-points.md "Already Solved By Us #3"; Unsolved #22 (AppState triggered by permission prompt itself).
- **Category:** already-solved
- **Evidence:** `waitingForSettings` ref gate in `src/hooks/use-permission-handler.ts:115`, only fires `recheckAfterSettings` when the gate is set after `openSettings()` was called. Multi-permission variant at `src/hooks/use-multiple-permissions.ts:263` uses a keyed variant.
- **Effort:** —

### iOS LIMITED state as a first-class flow
- **Source:** 02-pain-points.md "Already Solved By Us #4"; competitor gap from 01-competitors.md cross-cutting observation #3.
- **Category:** already-solved
- **Evidence:** `"limited"` in `PermissionStatus` (`src/types.ts:5`) and `PermissionFlowState` (`src/types.ts:21`), dedicated state machine transitions for CHECK_RESULT/REQUEST_RESULT/RECHECK_RESULT (`src/core/state-machine.ts:20`), `isLimited` boolean on result (`src/types.ts:102`), shipped `LimitedUpgradePrompt` component.
- **Effort:** —

### Multi-permission parity with per-permission handlers
- **Source:** 02-pain-points.md "Already Solved By Us #5"; Solved-Poorly #4.
- **Category:** already-solved
- **Evidence:** `useMultiplePermissions` (`src/hooks/use-multiple-permissions.ts`) with `handlers` record, `activePermission`, `blockedPermissions`, and `strategy: "sequential" | "parallel"`.
- **Effort:** —

### Dismissible blocked prompt + reset API
- **Source:** 02-pain-points.md "Already Solved By Us #6".
- **Category:** already-solved
- **Evidence:** `dismissBlocked()` + `reset()` on `PermissionHandlerResult` (`src/types.ts:110`). State machine handles `BLOCKED_PROMPT_DISMISS → denied` and a `RESET` top-level transition (`src/core/state-machine.ts:7`).
- **Effort:** —

### Declarative PermissionGate with renderDenied
- **Source:** 02-pain-points.md "Already Solved By Us #7".
- **Category:** already-solved
- **Evidence:** `PermissionGate` with `renderDenied`/`renderPrePrompt`/`renderBlockedPrompt` slots (`src/components/permission-gate.tsx:30`).
- **Effort:** —

### Testing story / `vi.mock("react-native-permissions")` antipattern
- **Source:** 01-competitors.md cross-cutting observation #2 ("competitors recommend vi.mock...").
- **Category:** already-solved
- **Evidence:** `createTestingEngine` (`src/engines/testing.ts`) with `setStatus`, `getRequestHistory`, `reset`. No competitor ships one. Undocumented in README though — see "Docs: testing engine discoverability" below.
- **Effort:** —

### Engine-agnostic core (no hard dep on RNP)
- **Source:** 01-competitors.md cross-cutting observation #2 (adapter layer as differentiator).
- **Category:** already-solved
- **Evidence:** `PermissionEngine` interface (`src/types.ts:11`), resolution order in `src/engines/resolve.ts` + `rnp-fallback.ts`, shipping RNP / Expo / noop / testing adapters.
- **Effort:** —

### `requestMultiple` key-order bug / multi-permission statuses mismatch
- **Source:** 02-pain-points.md Solved-Poorly #4 (RNP issue 976).
- **Category:** already-solved
- **Evidence:** `useMultiplePermissions` stores statuses in a keyed `Record<string, PermissionFlowState>` (`src/hooks/use-multiple-permissions.ts:46`). Each entry is processed individually — no ordering assumption.
- **Effort:** —

---

## Solvable In Current Architecture

### Android 16 `never_ask_again` hangs the request promise
- **Source:** 02-pain-points.md Unsolved #1 (RNP #966, RN #53887).
- **Category:** solvable-in-current-arch
- **Evidence:** We already have `requestTimeout` + `onTimeout` in `PermissionHandlerConfig` (`src/types.ts:90`) and `withTimeout` in the hook. On timeout we route to `blockedPrompt`. Solution: document this as the official Android-16 workaround, ship a sensible default (~4 s) when the engine reports Android 16, and surface it in the README's Android troubleshooting section. The engine adapter can optionally normalize the `denied` that the OS eventually returns into `blocked`.
- **Effort:** S

### Background location requires foreground-first orchestration
- **Source:** 02-pain-points.md Unsolved #2; 03-dev-friction.md Scenario 2.
- **Category:** solvable-in-current-arch
- **Evidence:** `useMultiplePermissions({ strategy: "sequential" })` is exactly the fit, but the sequential strategy doesn't currently abort the rest of the queue on a hard-dependency failure in a way that communicates "#2 required #1". Ship a `PermissionBundle` helper (a thin config wrapper) or an `LOCATION_FOREGROUND_THEN_BACKGROUND` preset that returns the right `MultiPermissionEntry[]` and adds a `dependsOn` field evaluated before each step. No new state machine work — just orchestration in `useMultiplePermissions.requestAll`.
- **Effort:** M

### Platform-conditional permission bundles (Bluetooth, etc.)
- **Source:** 03-dev-friction.md Scenario 8; Theme #4.
- **Category:** solvable-in-current-arch
- **Evidence:** Ship `Permissions.BLUETOOTH_BUNDLE`, `Permissions.LOCATION_BACKGROUND_BUNDLE` as arrays keyed by platform+version. Pure JS, lives next to `Permissions` in `src/engines/rnp.ts`. No new primitives.
- **Effort:** S

### Sequential retry / resume semantics are unclear
- **Source:** 03-dev-friction.md Scenario 10; Theme #5.
- **Category:** solvable-in-current-arch
- **Evidence:** `useMultiplePermissions` currently clears `pendingQueue` on denial in sequential mode (`src/hooks/use-multiple-permissions.ts:215`). Add a `resume()` method on the result (not `request()` which restarts) and an explicit documented contract. No new state; just a new method on `MultiplePermissionsResult`.
- **Effort:** S

### Hook renders default modal — no suppress / render-override on imperative hook
- **Source:** 03-dev-friction.md Scenarios 4, 5; Theme #2.
- **Category:** solvable-in-current-arch
- **Evidence:** This is actually a misread by the friction persona — `usePermissionHandler` does NOT render any modal; it only returns state. The modals are only rendered inside `PermissionGate`. But the README apparently leads readers to believe the hook renders UI. Fix: make the README crystal clear that `usePermissionHandler` is UI-less and always returns `state` for the caller to branch on. Optionally, relax `prePrompt`/`blockedPrompt` on the hook config to optional when `autoCheck: false` is set or when state machine doesn't need default copy.
- **Effort:** S (docs) / M (if also making `prePrompt` optional — requires nullable type in `PermissionHandlerConfig`)

### Required `prePrompt` / `blockedPrompt` config when hook renders nothing
- **Source:** 03-dev-friction.md Scenario 4 friction #1.
- **Category:** solvable-in-current-arch
- **Evidence:** `PermissionHandlerConfig.prePrompt: PrePromptConfig` is required (`src/types.ts:86`). The hook does not consume these fields at runtime — they're forwarded to `PermissionGate`. Make both fields optional; `PermissionGate` can require them at its own prop layer.
- **Effort:** S

### "Remember dismissal" with TTL
- **Source:** 03-dev-friction.md Scenario 3 friction #4.
- **Category:** solvable-in-current-arch
- **Evidence:** Add an optional `dismissPolicy?: { cooldownMs: number; storage: Storage }` config. Implement as a small module in `src/core/` that wraps the `onDeny` callback and gates `checkPermission()` on mount. Storage is pluggable so we don't force AsyncStorage.
- **Effort:** M

### Inline pre-prompt / popover pattern (non-modal)
- **Source:** 03-dev-friction.md Scenario 5.
- **Category:** solvable-in-current-arch
- **Evidence:** `PermissionGate.renderPrePrompt` already supports arbitrary JSX. The hook is UI-less. Docs fix: ship a recipe showing how to render an anchored popover via `renderPrePrompt` inside the gate and a separate recipe for the imperative "tap mic" flow using just `usePermissionHandler`.
- **Effort:** S

### "One-tap to ask" mode (skip pre-prompt on Android)
- **Source:** 03-dev-friction.md Scenario 5 friction #3.
- **Category:** solvable-in-current-arch
- **Evidence:** Add `skipPrePrompt?: boolean | "android"` to `PermissionHandlerConfig`. When set, `checkPermission` transitions directly from `checking → requesting` on `denied` status. This is a trivial hook change — no state machine changes, since `requesting` is reachable from `prePrompt` via `PRE_PROMPT_CONFIRM` and we can synthesize that event.
- **Effort:** S

### `openSettings` cannot deep-link to specific iOS permission sub-page
- **Source:** 02-pain-points.md Solved-Poorly #5 (RNP #973).
- **Category:** solvable-in-current-arch
- **Evidence:** Engine-level concern. Extend `PermissionEngine.openSettings(permission?: string): Promise<void>` (already backward-compatible since parameter is optional). RNP adapter can build `App-Prefs:root=LOCATION_SERVICES` URLs where available; others can ignore the argument. No state machine change.
- **Effort:** M

### Photo library `UNAVAILABLE` vs `DENIED` confusion after iOS disable
- **Source:** 02-pain-points.md Solved-Poorly #6 (RNP #851, #873, #908).
- **Category:** solvable-in-current-arch
- **Evidence:** The RNP engine adapter (`src/engines/rnp.ts:107`) currently just passes the raw result through. Add a normalization layer: when the permission is photos and status is `unavailable`, treat it as `blocked` since the feature exists but is disabled. Engine-level fix, no core changes.
- **Effort:** S

### iOS `undetermined → denied` confusion after Settings revoke
- **Source:** 02-pain-points.md Solved-Poorly #9 (RNP #295).
- **Category:** solvable-in-current-arch
- **Evidence:** Our `PermissionStatus` union has no `undetermined`; engines collapse it to `denied` already. The state machine happily moves `denied → prePrompt` on CHECK, which means a revoke is equivalent to a fresh ask — the correct behavior for most apps. Document this explicitly. No code change.
- **Effort:** S (docs)

### Android `checkMultiple` never returns BLOCKED
- **Source:** 02-pain-points.md Unsolved #9; Theme #8.
- **Category:** solvable-in-current-arch
- **Evidence:** Workaround pattern: `useMultiplePermissions` auto-request with `strategy: "parallel"` and interpret the `request` result as the authoritative status. Document the pattern; optionally ship an `engine.probe()` helper that on Android calls `request` for unknown permissions and normalizes the result. No new primitives; a capability the RNP engine can opt into via a flag.
- **Effort:** M

### Android 13 `POST_NOTIFICATIONS` returns `never_ask_again` on API <33
- **Source:** 02-pain-points.md Unsolved #16 (RN #36212).
- **Category:** solvable-in-current-arch
- **Evidence:** Version-gate in the RNP engine (`src/engines/rnp.ts:110`). Already routes `"notifications"` specially. Extend the special-case to short-circuit to `granted` on `Platform.Version < 33`.
- **Effort:** S

### Android 13 notifications start at `denied` instead of `undetermined`
- **Source:** 02-pain-points.md Unsolved #13.
- **Category:** solvable-in-current-arch
- **Evidence:** From the hook's perspective this is already the right behavior — `denied` in our model means "requestable," which matches "fresh install, not yet asked". Document it. If we want distinction between "never asked" and "asked once" we would need persistence (new primitive) — see "First-ask tracking" below.
- **Effort:** S (docs)

### `canAskAgain` always `true` for notifications on Android
- **Source:** 02-pain-points.md Unsolved #14.
- **Category:** solvable-in-current-arch
- **Evidence:** Expo engine's `mapExpoStatus` (`src/engines/expo.ts:45`) trusts `canAskAgain`. Add a heuristic: on Android, if `request()` is called twice with `denied` result, promote to `blocked`. Requires a small "request counter" inside the engine or hook. No core primitive.
- **Effort:** M

### Android dialog dismissal returns `never_ask_again`
- **Source:** 02-pain-points.md Unsolved #15 (RN #30158).
- **Category:** solvable-in-current-arch
- **Evidence:** Engine-layer normalization: after a `request()` returns `blocked` on Android and this is the *first* call, re-`check()` and if the underlying RNP status is actually `denied`/requestable, override back to `denied`. A stateful wrapper around the RNP engine. Not pretty, but architecturally it fits in the adapter layer.
- **Effort:** M

### Expo permission check stale after Settings return
- **Source:** 02-pain-points.md Unsolved #10 (Expo #16701, #22021).
- **Category:** solvable-in-current-arch
- **Evidence:** Already solved by our AppState re-check (`waitingForSettings` gate + `recheckAfterSettings`). The Expo engine benefits automatically because the hook calls `engine.check()` on return. Ensure the Expo engine doesn't cache stale permissionResponse objects — check `src/engines/expo.ts:216`, it does not cache. Document this advantage in README.
- **Effort:** S (docs)

### Expo `requestPermission()` no-ops after revoke
- **Source:** 02-pain-points.md Unsolved #11 (Expo #28757).
- **Category:** solvable-in-current-arch
- **Evidence:** Our hook correctly interprets Expo's `denied + !canAskAgain` as `blocked` and routes the user through `blockedPrompt → openingSettings`, which solves this. Our Expo engine adapter (`src/engines/expo.ts:45`) already does the mapping. Document as a strength.
- **Effort:** S (docs)

### Expo `useCameraPermissions` stale after native grant
- **Source:** 02-pain-points.md Unsolved #12 (Expo #28756).
- **Category:** solvable-in-current-arch
- **Evidence:** Our hook re-calls `engine.request` and updates local state synchronously in the `.then` handler (`src/hooks/use-permission-handler.ts:75`), bypassing Expo's hook staleness entirely. We don't depend on Expo's hook at all. Document.
- **Effort:** S (docs)

### Camera + photo request twice in a row with no orchestration
- **Source:** 02-pain-points.md Solved-Poorly #3 (RNP #638).
- **Category:** solvable-in-current-arch
- **Evidence:** `useMultiplePermissions` with `strategy: "sequential"` is the orchestrator. The gap is that each request's pre-prompt must manage timing between system dialogs. Sequential already handles this (the next permission only starts after the previous one finishes). Docs + example needed.
- **Effort:** S (docs)

### "No Permission Handler Detected" preflight
- **Source:** 02-pain-points.md Solved-Poorly #8; Theme #9.
- **Category:** solvable-in-current-arch
- **Evidence:** At engine-resolve time (`src/engines/use-engine.ts`, `rnp-fallback.ts`), add a `verifyEngine()` startup diagnostic that calls `check()` on the target permission and catches the RNP "No handler detected" error, throwing a friendly error with the exact Podfile snippet the user should add. Lives in the RNP adapter, no core changes.
- **Effort:** M

### Platform version branching is everywhere
- **Source:** 02-pain-points.md Theme #10; 03-dev-friction.md Scenario 7 (calendars write-only fallback).
- **Category:** solvable-in-current-arch
- **Evidence:** The `Permissions` constant in `src/engines/rnp.ts:12` already has a `p()` helper that branches on Android API level. Extend to iOS (use `Platform.Version` on iOS too), ship `CALENDARS_WRITE_ONLY` that falls back to `CALENDARS` on iOS <17. Pure data change.
- **Effort:** S

### Cross-platform key mismatch in `statuses` record
- **Source:** 03-dev-friction.md Scenario 10 friction #1.
- **Category:** solvable-in-current-arch
- **Evidence:** `statuses` is keyed by the raw platform-specific permission string. Add an optional `id` field to `MultiPermissionEntry` (e.g., `{ id: "camera", permission: Permissions.CAMERA, ... }`), and key by `id` when present, falling back to permission string. Backwards compatible.
- **Effort:** S

### `dismissBlocked`, `reset`, `isLimited`, `handlers`, `activePermission`, `blockedPermissions` undocumented
- **Source:** 03-dev-friction.md Theme #1 (hit in scenarios 1, 3, 4, 5, 6, 10).
- **Category:** solvable-in-current-arch
- **Evidence:** All exist on `PermissionHandlerResult` / `MultiplePermissionsResult` (`src/types.ts:98`, `src/types.ts:152`) and are implemented in the hooks. The README does not document them. Pure documentation/DX work: rewrite the README API reference to enumerate every field on the result types with runnable examples.
- **Effort:** M

### `LimitedUpgradePrompt` and `engine.requestFullAccess` not connected to hook
- **Source:** 03-dev-friction.md Scenario 1 friction #2; Theme #3.
- **Category:** solvable-in-current-arch
- **Evidence:** `PermissionEngine.requestFullAccess?` exists in the types (`src/types.ts:15`) but `usePermissionHandler` never calls it. The `LimitedUpgradePrompt` component exists but there's no hook method to wire its `onUpgrade` to. Add `requestFullAccess: () => void` to `PermissionHandlerResult`, have it call `engine.requestFullAccess?.(permission)` and treat the result like a normal REQUEST_RESULT. No state machine change required — the existing `requesting → granted/limited` path is reused. Also add a `renderLimited` slot to `PermissionGate`.
- **Effort:** M

### iOS limited photo re-prompt selection picker
- **Source:** 02-pain-points.md Unsolved #5 (RNP #689, #612).
- **Category:** solvable-in-current-arch (partially)
- **Evidence:** The OS-level API is `PHPhotoLibrary.shared().presentLimitedLibraryPicker(...)`. RNP doesn't expose it, but expo-media-library does (`presentPermissionsPickerAsync`). The fix is adapter-level: `createRNPEngine().requestFullAccess("photoLibrary")` can no-op or throw; `createExpoEngine().requestFullAccess("photoLibrary")` can call the Expo method. A custom engine can wrap a native module that calls `presentLimitedLibraryPicker`. No core change; the `requestFullAccess` hook exists in our interface already.
- **Effort:** M (Expo adapter) / L (if we ship our own tiny native module for RNP users)

### Debug function form undocumented
- **Source:** 03-dev-friction.md Theme #1.
- **Category:** solvable-in-current-arch
- **Evidence:** `debug?: boolean | ((msg: string) => void)` (`src/types.ts:92`). Docs work only.
- **Effort:** S

### `PermissionsAndroid` tutorial prevalence
- **Source:** 02-pain-points.md Solved-Poorly #7; Theme #9.
- **Category:** solvable-in-current-arch
- **Evidence:** SEO / marketing problem. Ship a landing-page comparison table (vs. PermissionsAndroid, RNP, Expo) in the README.
- **Effort:** S (docs)

### Bluetooth manifest setup
- **Source:** 02-pain-points.md Solved-Poorly #10 (RNP #653).
- **Category:** solvable-in-current-arch
- **Evidence:** Expo config plugin. Ship `react-native-permission-handler/plugin` that declares the manifest entries for the bundles used. No runtime code.
- **Effort:** M

### `onGrant` firing semantics unclear
- **Source:** 03-dev-friction.md Scenario 6 friction #1.
- **Category:** solvable-in-current-arch
- **Evidence:** Current implementation fires `onGrant` on transition into granted/limited from any other state, including after mount-time `check` (`src/hooks/use-permission-handler.ts:51` — note guard on `s !== "granted" && s !== "limited"`). Document it precisely in the README.
- **Effort:** S (docs)

### Testing engine discoverability
- **Source:** 01-competitors.md cross-cutting observation #2; 03-dev-friction.md Theme #1.
- **Category:** solvable-in-current-arch
- **Evidence:** `createTestingEngine` exists but is not in README. Add a "Testing your permission flows" section showing the controllable engine.
- **Effort:** S (docs)

---

## Needs New Primitive

### One-time grants auto-revoke with no event
- **Source:** 02-pain-points.md Unsolved #3, #4; Theme #5.
- **Category:** needs-new-primitive
- **Evidence:** Requires a new `ONE_TIME_GRANT_EXPIRED` event and a matching state transition, plus a new `isEphemeral: boolean` on the result. On foreground, if the last known status was `granted` but a re-check now returns `denied` *and* we never saw an openSettings round-trip, synthesize the event. Needs a new flag in config (`detectEphemeralGrants?: boolean`) so apps can opt in without breaking existing AppState semantics.
- **Effort:** M

### iOS "Allow Once" vs "Allow While Using" distinction
- **Source:** 02-pain-points.md Unsolved #4 (RNP #964).
- **Category:** needs-new-primitive
- **Evidence:** Would need a new `PermissionStatus` value (e.g., `"granted-ephemeral"`) or a sibling `scope` field on the status. The RNP engine would need to detect this via iOS 14+ `CLAuthorizationStatus` + heuristics (CoreLocation reports `authorizedWhenInUse` for both). Likely needs a native bridge.
- **Effort:** L

### "Settings-only" permissions (exact alarms, full-screen intent, accessibility)
- **Source:** 02-pain-points.md Unsolved #8; Theme #7.
- **Category:** needs-new-primitive
- **Evidence:** A new `settingsOnly: true` flag on permission descriptors and a state machine path that skips `requesting` entirely and routes `checking → blockedPrompt → openingSettings → recheckingAfterSettings`. Requires a new `PermissionDescriptor` type replacing the raw string, so permission metadata (settingsOnly, deep-link target, minimum OS version) travels with it.
- **Effort:** L

### First-ask / never-asked tracking ("undetermined" real distinction)
- **Source:** 02-pain-points.md Unsolved #13 + deeper version; Solved-Poorly #9.
- **Category:** needs-new-primitive
- **Evidence:** Distinguishing "never asked" from "asked and denied" requires persistent storage and a new `"undetermined"` value in `PermissionStatus`. New: pluggable `storage` config (same one used for dismissPolicy above), and a new state/flag `hasBeenAsked`. Cannot be done in the engine alone because `check()` is stateless by contract.
- **Effort:** M

### Multi-target iOS (App Clip / Share extension)
- **Source:** 02-pain-points.md Unsolved #17.
- **Category:** needs-new-primitive (arguably out-of-scope)
- **Evidence:** Would require target-aware engine resolution and a way for host/extension code to share config. In principle, an engine factory that receives a `target: "main" | "appclip" | "share"` parameter and returns a scoped adapter. But most of the complexity lives in RNP's Podfile — below our layer.
- **Effort:** L

### Android 13 `openSettings` → process kill recovery
- **Source:** 02-pain-points.md Unsolved #21 (RNP #747).
- **Category:** needs-new-primitive
- **Evidence:** After process relaunch, the hook has no memory that it was `waitingForSettings`. Needs optional persistence of the `waitingForSettings` flag + the active permission, so on cold-start the hook can resume the `recheckingAfterSettings` transition. Same storage primitive as first-ask tracking. A cold-start resume API is new.
- **Effort:** M

### `PermissionsWall` onboarding-wall component
- **Source:** 03-dev-friction.md Scenario 10 friction #6.
- **Category:** needs-new-primitive
- **Evidence:** A new component that wraps `useMultiplePermissions` and renders a progress view / per-permission row / continue button, blocking navigation until `allGranted`. Not strictly "new primitive" (builds on existing hook) but is a new surface worth adding to components/.
- **Effort:** M

### Dependency graph for multi-permission sequencing
- **Source:** 03-dev-friction.md Scenario 2; Theme #4.
- **Category:** needs-new-primitive
- **Evidence:** Sequential strategy currently runs a flat queue. Real-world flows (fg → bg location, camera → mic+photos) need DAG semantics. Add `MultiPermissionEntry.dependsOn?: string[]` and a topological sort in `useMultiplePermissions.requestAll`. This is a new field on a public type and new runtime logic — not just an engine tweak.
- **Effort:** M

---

## Out Of Scope

### HealthKit / HomeKit / Google Fit / Local Network
- **Source:** 02-pain-points.md Unsolved #18, #19; 03-dev-friction.md Scenario 9; Theme #7.
- **Category:** out-of-scope
- **Evidence:** These domains have fundamentally different permission models (per-data-type scopes, "unknowable" status by Apple design, OAuth-flavored flows). Our `PermissionStatus` is a 5-value enum and our engine contract is binary per-permission. HealthKit in particular breaks the abstraction — you can't tell if the user denied, so `check()` semantics collapse. Users needing these domains should use `react-native-health` etc. directly; our engine interface is available if they want to adapt one, but it's not a first-party target.
- **Effort:** —

### iOS 14 Local Network permission
- **Source:** 02-pain-points.md Unsolved #19 (RNP #509).
- **Category:** out-of-scope
- **Evidence:** RNP has never added it; we'd need to ship native code. Our library is explicitly "pure JS/TS with no native code." If RNP ever ships it, we get it for free in the adapter.
- **Effort:** —

### iOS 18 limited contacts management
- **Source:** 02-pain-points.md Unsolved #6 (RNP #938); 03-dev-friction.md Scenario 6 friction #2.
- **Category:** out-of-scope (for now; flip to solvable when RNP ships the API)
- **Evidence:** Same as limited photos — needs a native-side API that exposes `CNContactStore.presentLimitedContactsPicker`. Blocked on RNP/Expo shipping an underlying method; once they do, our `requestFullAccess` wiring (see "Limited/Upgrade" solvable entry) handles it at the adapter layer. Until then there is nothing to call.
- **Effort:** —

### Android 14 partial photo access ("select more photos")
- **Source:** 02-pain-points.md Unsolved #7 (RNP #959).
- **Category:** out-of-scope (blocked on upstream)
- **Evidence:** Android 14's `READ_MEDIA_VISUAL_USER_SELECTED` is already in our `Permissions.ANDROID` constant list (`src/engines/rnp.ts:91`), but the "expand selection" picker needs a native API RNP doesn't expose yet. Same shape as iOS limited photos — wiring is ready, backend missing.
- **Effort:** —

### ATT `unavailable` false-positives
- **Source:** 02-pain-points.md Unsolved #20 (RNP #576, #500).
- **Category:** out-of-scope
- **Evidence:** This is a plist/SKAdNetwork setup bug in the app project, not something a JS wrapper can detect or fix without reading the native Info.plist. A preflight check could warn, but accurately detecting "ATT is misconfigured" is beyond what a pure-JS library can do reliably.
- **Effort:** —

### Expo-image-picker ignores limited permission
- **Source:** 02-pain-points.md Unsolved #23 (Expo #35623, #27117).
- **Category:** out-of-scope
- **Evidence:** This is an Expo bug — the picker UI decision is inside `expo-image-picker`'s native code. Nothing a permission library can do; the user's permission state is correct, the picker is wrong.
- **Effort:** —

### PermissionsDispatcher-style compile-time exhaustiveness
- **Source:** 01-competitors.md (PermissionsDispatcher section).
- **Category:** out-of-scope
- **Evidence:** Would require a Babel plugin. The architecture brief says zero runtime deps and keep the surface small. TypeScript discriminated-union exhaustiveness is the JS-idiomatic alternative and we already have it: `PermissionFlowState` is a union; `switch (state)` with `never` exhaustion gives the same property. Document the pattern in README instead.
- **Effort:** — (docs cross-reference)
