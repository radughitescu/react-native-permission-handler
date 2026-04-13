# Validated v0.7.0 Roadmap Candidates

Devil's Advocate review of the 32 items in `04-triage.md` marked `solvable-in-current-arch` (24) or `needs-new-primitive` (8). Every item was cross-examined on four questions: Who hits this? How often (cite)? Why us? Failure mode? Items that cannot answer all four are killed.

## Summary

- **Validated:** 12
- **Conditional:** 7
- **Killed:** 13
- **Total reviewed:** 32

---

## Validated

### 1. Android post-dialog status normalization layer
A single adapter-level normalizer that fixes: Android 16 `never_ask_again` hang (Unsolved #1), dialog-dismiss returns `never_ask_again` (Unsolved #15), `POST_NOTIFICATIONS` on API <33 (Unsolved #16), Android 13 notifications start `denied` (Unsolved #13 — documented), and `canAskAgain` always-true for notifications (Unsolved #14).

- **Who:** Any RN dev shipping to the Android install base — Play Store apps that ship to API 30/33/34/35/36 simultaneously. Specifically Android-primary teams (non-Expo, non-iOS-first) who hit the `never_ask_again` lies first.
- **How often:** Pain-points Theme #3 is ranked as "strongest roadmap signal for v0.7.0"; compounded from 6 distinct tickets (Unsolved #1, #13, #14, #15, #16, Solved-Poorly #4), including upstream RN #30158 (19 comments, 6 reactions), RNP #966 (still open, assigned), RN #53887, RN #36212 (10 comments). High frequency in both the aggregator signal and the original library trackers.
- **Why us:** Our pluggable engine layer is the correct home for lies-from-the-OS normalization. RNP can't ship this without a breaking change to its status contract; we can ship it as an opt-in flag on `createRNPEngine({ normalizeAndroid: true })`. Nobody else has an adapter surface to put it in.
- **Failure mode:** Heuristic-based (count request calls to promote `denied → blocked` on Android notifications; re-`check()` after `blocked` response). Could mis-fire and under-block a truly blocked perm on first run. Mitigation: opt-in flag, documented semantics, testing engine coverage of every heuristic branch. Risk is real but bounded to the RNP adapter file.
- **Effort:** M (combined from S+M+S items in triage)

### 2. Android 16 request timeout + blocked-routing default
The specific Android 16 case: `request()` never settles. We already have `requestTimeout` + `onTimeout` — ship it with a sensible default and engine detection.

- **Who:** Any app that targets SDK 36 / runs on Android 16 preview devices. Will be everyone within 6 months.
- **How often:** Unsolved #1, high frequency, still-open maintainer-assigned ticket (RNP #966) + upstream RN #53887. Cited as "reliability-breaking for any blocked recovery flow".
- **Why us:** We already own the state machine path that routes a timed-out `requesting` to `blockedPrompt`. RNP can't route to UI; we already do. This is the single most concrete win where our architecture trivially beats theirs.
- **Failure mode:** Default timeout value is a tuning knob — too short kills slow devices on legit `requesting`. Mitigation: version-gate the default (only on Android 16+), keep it generous (~5s), opt-out via explicit `requestTimeout: null`.
- **Effort:** S

### 3. README documentation rewrite (full API surface + recipes)
Document everything already shipped: `dismissBlocked`, `reset`, `isLimited`, `handlers`, `activePermission`, `blockedPermissions`, `LimitedUpgradePrompt`, `requestFullAccess`, `onSettingsReturn`, `debug` function form, `createTestingEngine`, `onGrant` firing semantics, `autoCheck: false` manual flow, sequential resume.

- **Who:** Every first-time reader of the npm page. Dev-friction file's persona is literally a mid-level RN dev reading only the README — they walked away thinking the library was 60% of what it is.
- **How often:** Dev-friction Theme #1 is the #1 ranked friction, explicitly hit in scenarios 1, 3, 4, 5, 6, 10 (6 out of 10 scenarios). Every single scenario required type-file spelunking.
- **Why us:** Nothing to do with architecture; this is an existential obligation. Undocumented features are invisible features, and we're losing the marketing battle to libraries with weaker tech but better READMEs.
- **Failure mode:** Docs drift. Mitigation: pull API reference from TypeScript types via a build step; keep recipes as runnable examples in `/example`.
- **Effort:** M

### 4. `requestFullAccess` on hook result + `renderLimited` on `PermissionGate`
Wire the existing engine method through to the hook + `PermissionGate`, so the shipped-but-disconnected `LimitedUpgradePrompt` actually works.

- **Who:** Any app using iOS photo/contacts limited access flows. Photo pickers, social apps, KYC scanners.
- **How often:** Dev-friction Scenario 1 "Painful" verdict centers on this exact gap; Theme #3 ranks it as one of the top 5 frictions. The headline v0.6.0 feature is half-wired.
- **Why us:** We already ship the state, the component, and the engine interface slot. Completing the triangle is table-stakes. Competitors don't model `limited` as a first-class state at all, so once wired we have the only working upgrade-flow primitive in the ecosystem.
- **Failure mode:** On RNP, `requestFullAccess("photoLibrary")` has no native backing — it must no-op or throw. Expo has `presentPermissionsPickerAsync`. We ship it per-engine, with the RNP version throwing a clear "upgrade to Expo engine or ship a native module" error. Footgun risk: low — the feature just doesn't work for RNP users, but they learn why.
- **Effort:** M

### 5. Optional `prePrompt` / `blockedPrompt` config when using the imperative hook
Make both fields optional in `PermissionHandlerConfig`. `PermissionGate` keeps requiring them at its own prop layer.

- **Who:** Devs building full-screen takeover UIs or inline pre-prompts via `usePermissionHandler` — KYC, onboarding, voice-note composers.
- **How often:** Dev-friction Scenarios 4 and 5 both hit this as friction #1, and the confusion that the hook "renders a modal" is a Scenario 4 & 5 sub-theme (the hook is UI-less but the README implies otherwise).
- **Why us:** Straightforward type change we control entirely. Eliminates the dummy-string ritual that every custom-UI user performs today.
- **Failure mode:** Negligible — the hook never consumes these fields at runtime. Pure type cleanup.
- **Effort:** S

### 6. `PermissionBundle` / platform-conditional permission presets
Ship `Permissions.BLUETOOTH_BUNDLE`, `Permissions.LOCATION_BACKGROUND_BUNDLE`, plus iOS-version-aware `CALENDARS_WRITE_ONLY` fallback.

- **Who:** IoT apps (BLE), delivery/rideshare apps (fg→bg location), booking apps (calendars). Three specific vertical personas, each common.
- **How often:** Bluetooth is Dev-friction Scenario 8 "Painful"; fg→bg location is Scenario 2 "Painful" + Unsolved #2 (high frequency, Expo #16701 has 15 comments and is the canonical ticket); calendars is Scenario 7 "Workable but DIY-heavy". Theme #4 ranks sequencing/dependencies as a top friction.
- **Why us:** We already have the `p()` helper in `src/engines/rnp.ts` that branches on Android API. Extending to iOS version branching and ship-bundled constants is a pure data change in our engine layer. RNP punts this entirely; Expo ships nothing like it.
- **Failure mode:** Bundles drift from OS reality (new Android versions change the required set). Mitigation: tie each bundle to a `minOsVersion` and lean on semver minors to update.
- **Effort:** S

### 7. `skipPrePrompt` option (one-tap-to-ask mode)
Add `skipPrePrompt?: boolean | "android"` to `PermissionHandlerConfig`. Transitions `checking → requesting` directly.

- **Who:** Composer/inline-action flows (voice notes, camera button in chat, tap-to-scan QR). Specifically the iMessage/WhatsApp interaction pattern.
- **How often:** Dev-friction Scenario 5 friction #3 explicitly calls this out. Also relevant to Android-only flows where pre-prompts are redundant (the system dialog is re-shows-able until the 2-denial cap).
- **Why us:** Our state machine has the transition already — we just synthesize the `PRE_PROMPT_CONFIRM` event. Trivial hook-layer change. No competitor has this because no competitor models `prePrompt` as a state in the first place.
- **Failure mode:** Devs use it on iOS and blow their one-shot system dialog. Mitigation: default `"android"` value, console.warn on iOS usage in dev builds, README guardrail.
- **Effort:** S

### 8. `engine.openSettings(permission?)` deep-linking
Extend the engine method to take an optional permission argument; RNP adapter builds `App-Prefs:root=...` URLs where iOS allows.

- **Who:** Any app with a blocked-recovery flow. Every user of the library.
- **How often:** Solved-Poorly #5 (RNP #973), flagged as medium frequency but affects every `openSettings()` call site — the surface area is 100%. Extra taps are the #1 complaint in blocked-recovery tickets.
- **Why us:** Our `PermissionEngine` interface can add the parameter as a backward-compatible optional. RNP would have to add it to every adapter method — which they won't, it's been open forever.
- **Failure mode:** iOS URL schemes are unofficial and can break per iOS version. Mitigation: try/catch, fall back to generic `openSettings()`, document as best-effort.
- **Effort:** M

### 9. "No Permission Handler Detected" preflight diagnostic
On RNP engine resolve, try a `check()` on the target permission at first hook-mount. Catch the RNP "no handler" native error and rethrow a friendly message with the exact Podfile snippet.

- **Who:** New users setting up RNP for the first time. Specifically the "I followed the README but still get an error" persona who bounces off the ecosystem.
- **How often:** Solved-Poorly #8 is high frequency — 3 distinct RNP tickets (#449, #515, #744), entire blog posts devoted to the fix. Theme #9 "setup cliffs" ranks this as a top barrier-to-entry.
- **Why us:** Our engine resolution layer is the right place for setup diagnostics. RNP can't meta-diagnose itself at the native layer; we can wrap it at the JS boundary.
- **Failure mode:** First-call overhead on mount (extra `check()` round-trip). Mitigation: only runs once per engine instance, opt-out via `verifyEngine: false`.
- **Effort:** M

### 10. Cross-platform `id` key on multi-permission entries
Add optional `id` to `MultiPermissionEntry`, key `statuses` by `id` when present.

- **Who:** Anyone using `useMultiplePermissions` who wants platform-agnostic row rendering — i.e., everyone doing an onboarding wall.
- **How often:** Dev-friction Scenario 10 friction #1, explicitly called out. Also implicit in Scenario 8 (Bluetooth) — cross-platform arrays force `Platform.select` at every call site.
- **Why us:** Our `MultiPermissionEntry` type is already an object, not a raw string. Adding a field is backward-compatible. Nothing RNP-equivalent exists.
- **Failure mode:** Duplicate IDs in a user's config would silently clobber statuses. Mitigation: dev-mode warning on duplicate.
- **Effort:** S

### 11. Sequential `resume()` on multi-permission result
Add an explicit `resume()` method distinct from `request()` (which restarts). Documented contract for what happens on denial mid-sequence.

- **Who:** Onboarding-wall builders (Dev-friction Scenario 10), fg→bg location flows (Scenario 2).
- **How often:** Dev-friction Theme #5 (resume/retry) ranks as a top friction, hit in scenarios 2, 8, 10. The "does retry restart or resume?" ambiguity is in every multi-permission ticket.
- **Why us:** `useMultiplePermissions` owns the queue. Adding a `pendingQueue` resume path is a local change in one file.
- **Failure mode:** Stale queue after permissions config changes (user edits the permissions array between denial and resume). Mitigation: invalidate queue on config identity change.
- **Effort:** S

### 12. Photo library `UNAVAILABLE → BLOCKED` engine normalization
RNP adapter rewrites `unavailable` to `blocked` specifically for photo library when the feature exists but is disabled.

- **Who:** Any iOS app with photo picker that hides feature UI on `UNAVAILABLE` status (which is the correct interpretation of the state name).
- **How often:** Solved-Poorly #6, backed by 3 distinct RNP tickets (#851, #873, #908) — same underlying confusion at medium frequency, but high severity (apps permanently hide features for users who could recover via Settings).
- **Why us:** Engine-level normalization is exactly what our adapter layer is for. RNP can't change the semantic without a breaking change to its public API.
- **Failure mode:** If Apple ever ships a device class where photos is truly unavailable, we'd incorrectly report blocked. Currently no such device. Low risk.
- **Effort:** S

---

## Conditional

### Sequential `dependsOn` / dependency graph for multi-permission
- **Reframe:** Don't ship a general DAG. Ship it as a concrete API for the one case that actually needs it: `LOCATION_FOREGROUND_THEN_BACKGROUND`. Sequential already runs in order; if the preset bundle encodes the dependency, most users never see the graph. Full DAG is overkill and adds a new type to the public surface for a single real-world use case.
- Validated as part of item #6 (PermissionBundles); killed as a standalone primitive.

### Expo config plugin for Bluetooth manifest setup
- **Reframe:** Only ship as part of an Expo-first auto-discovery story that already exists in v0.5.0. Audit what the current Expo engine covers; if it already emits manifest entries, this is docs-only. If not, scope strictly to Bluetooth + Location background (the two cases with real ticket evidence).
- Medium effort for a slice we only vaguely need — the current `createExpoEngine` auto-discovery may cover the runtime side; the manifest side is a separate concern. Needs investigation before committing.

### "Remember dismissal" with TTL (`dismissPolicy`)
- **Reframe:** Ship only if we also ship the pluggable `storage` primitive for first-ask tracking (see killed list). One storage abstraction, two consumers. As a standalone feature, it's bloat — every app can do this in 10 lines with their own AsyncStorage wrapper. As part of a reusable persistence primitive, it earns its place.
- Evidence is a single dev-friction scenario (#3 friction #4) — medium signal.

### `PermissionsWall` component
- **Reframe:** Ship as a **recipe in docs**, not a component. The dev-friction author literally said "the library handles the state but not the 'wall' UX — I build that myself. Fine." They validated the primitives. A pre-built component adds UI surface area we have to maintain forever for questionable reuse (every app's onboarding wall is branded differently).
- Could be validated if scoped to a headless component (render-prop only, zero default UI).

### iOS limited photo re-prompt selection picker (Expo adapter)
- **Reframe:** Only ship the Expo-adapter half. Expo exposes `presentPermissionsPickerAsync`; wiring it through `createExpoEngine.requestFullAccess` is cheap and concrete. Drop the "ship our own native module for RNP users" plan — that violates the zero-native-code constraint.
- Validated as the Expo-engine slice of item #4; rejected as a standalone effort.

### Camera+photo sequential orchestration docs
- **Reframe:** Roll into item #3 (README rewrite) as a specific recipe. Not a separate item.

### Platform-version branching extensions (iOS `Platform.Version` awareness in `p()` helper)
- **Reframe:** Only ship as part of the `PermissionBundle` constants in item #6. The generalized "iOS version helper" is solving a problem nobody filed a ticket about outside of calendars write-only.

---

## Killed

### Android `checkMultiple` never returns BLOCKED (probe helper)
Fails "what's the failure mode": a probe that calls `request()` for unknown permissions pops system dialogs. That's the exact antipattern the library exists to prevent. The pain is real (Unsolved #9) but the fix is worse than the disease. Document as a known Android limitation and move on.

### Expo check stale after Settings return (docs-only)
Already solved by our AppState re-check. Docs-only — collapse into item #3. No standalone work.

### Expo `requestPermission` no-ops after revoke (docs-only)
Already solved by our blocked routing. Collapse into item #3.

### Expo `useCameraPermissions` stale after native grant (docs-only)
Already solved. Collapse into item #3.

### iOS `undetermined → denied` confusion (docs-only)
Collapse into item #3.

### `onGrant` firing semantics docs
Collapse into item #3. Not a standalone roadmap item.

### Testing engine discoverability
Collapse into item #3.

### Debug function form docs
Collapse into item #3.

### `PermissionsAndroid` comparison table
SEO/marketing. Collapse into item #3 or handle as a website/blog task. Not a library change.

### One-time grants auto-revoke detection (`isEphemeral`, `ONE_TIME_GRANT_EXPIRED`)
Fails "why us" and "failure mode". The Android auto-revoke window (30-60s) is a heuristic nobody can get right without native AppOps integration we don't have. A foreground re-check-based synth event will fire on every backgrounding during normal use, producing false positives. Pain is real (Unsolved #3, open 5+ years on RNP) but the proposed implementation is a footgun factory. Reject until we have a native signal to hook into.

### iOS "Allow Once" vs "Allow While Using" (`granted-ephemeral` status)
Fails "why us". Requires native bridge (per triage: L effort, "likely needs a native bridge"). We're pure-JS. Hard constraint. Kill.

### Settings-only permissions primitive (`PermissionDescriptor` refactor)
Fails "how often" and "failure mode". Evidence is one RNP ticket (#762, single issue) plus HealthKit/HomeKit items already marked out-of-scope. The fix requires replacing the raw permission string with a new `PermissionDescriptor` type across the entire public API — a breaking change to the main type. Cost of architectural contamination is massive for a medium-frequency request. Reject; could be revisited as a v1.0 redesign.

### First-ask / never-asked tracking (`undetermined` + pluggable storage)
Fails "why us". Evidence is two Expo issues (Unsolved #13, #23908/#19043) where the actual pain is "docs should say Android 13 notifications start `denied` = fresh install". We already document that behavior (or will in item #3). Adding persistent storage + a new `"undetermined"` status value to distinguish "never asked" from "asked once" is a breaking change to `PermissionStatus` and a new required primitive for a synthetic distinction most apps don't care about. Kill.

### Android 13 `openSettings` → process kill recovery (cold-start resume)
Fails "how often" and "failure mode". Single ticket (Unsolved #21, RNP #747), medium frequency. Requires persistent state for `waitingForSettings`, a cold-start resume API, and careful timing around app init. Complexity budget is massive; user base is narrow (Android 13 notifications flow only, and the OS behavior has changed in later versions). Let the OS fix this; document the known issue.

### Multi-target iOS (App Clip / share extension)
Triage already flags as "arguably out-of-scope". Confirmed kill. Most of the complexity lives in RNP's Podfile — below our layer.

---

## Notes

12 validated items is above the target of 10. The validated list is deliberately biased toward **S and M effort items with high-frequency evidence**. Three of the twelve (items #3, #5, #7) are nearly free; five more (#1, #2, #6, #8, #10, #11, #12) are small-to-medium adapter-layer or hook-layer changes; the other three (#4, #9) are the only items requiring real design work.

The biggest single win by evidence weight is item #1 (Android normalization) — it's the roadmap's center of gravity. The biggest single win by user reach is item #3 (README rewrite) — every user hits it, and it unlocks perceived value from features already shipped.

What got killed: every item requiring persistent storage, every item requiring a native bridge, and every item whose evidence was a single ticket. That's the right cut.
