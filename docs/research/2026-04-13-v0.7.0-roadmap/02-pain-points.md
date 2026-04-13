# Competitor Pain Points

## Methodology

This report aggregates user pain reported across the primary permission libraries and ecosystems in the React Native world. It is intended as the **primary signal source** for planning v0.7.0 of `react-native-permission-handler`.

**Sources crawled (2026-04-13):**

- `zoontek/react-native-permissions` GitHub Issues — open list, closed list (pages 1–2, sorted by creation date desc), and targeted searches for `BLOCKED`, `notifications`, `location`, `background`, `photo library`. Date range: roughly Q1 2024 – Q1 2026 for closed issues, all open issues regardless of age (the oldest open issue dates from 2018 and is still routinely referenced by users).
- `facebook/react-native` GitHub Issues — `PermissionsAndroid` related reports for Android 11+, 13, 16 (`#30158`, `#27240`, `#36212`, `#53887`, `#35638`, `#23021`).
- `expo/expo` GitHub Issues — permission-related issues for `expo-camera`, `expo-location`, `expo-notifications`, `expo-media-library`, `expo-image-picker` (`#28757`, `#28756`, `#16701`, `#22021`, `#23805`, `#23908`, `#19043`, `#11481`, `#44180`, `#20207`, `#22251`, `#35623`, `#27117`, `#33911`).
- Stack Overflow — tag `react-native-permissions`, and free-form searches for "never_ask_again", "check always denied", "openSettings appstate refresh".
- Web searches across Medium, LogRocket, OneUptime, Reddit, and various dev blogs documenting common pain ("Managing app permissions in React Native", "Mastering Permission Handling", etc.).
- `facebook/react-native` PermissionsAndroid docs and the RNP README (for positioning / understanding known limitations acknowledged by maintainers).

**Methodology notes:**

- Stack Overflow's tag listing page blocked WebFetch (bot mitigation); SO pain is captured indirectly via aggregator pages (appsloveworld, hashnode, rssing) and the mirror of high-vote questions that showed up through search.
- Reddit r/reactnative threads did not surface directly (search-engine index freshness); where possible I quoted the recurring themes that show up in the library issue trackers and blog posts that cite community complaints.
- I only cite URLs I actually loaded or that came back from a real search. Links that 404'd or were gated were skipped entirely — no fabricated URLs.
- "Frequency" is graded qualitatively: **low** = 1 person, isolated; **medium** = a recurring theme with multiple issues; **high** = many-duplicate-issues, explicitly flagged as duplicates by maintainers, or repeatedly surfacing in both issues and SO/blog content.

---

## Unsolved (23 items)

Real user pain that has no good answer today in `react-native-permissions`, Expo, or PermissionsAndroid — these are the strongest v0.7.0 roadmap signals.

### 1. Android 16 `never_ask_again` hangs the request promise
- **Pain:** On Android 16, `request()` never resolves when the permission is in `never_ask_again` state — the user has to background/foreground the app before the promise settles, making any "blocked recovery" flow unreliable.
- **Source:** https://github.com/zoontek/react-native-permissions/issues/966 (open, assigned to maintainer) and https://github.com/facebook/react-native/issues/53887
- **Frequency:** high (raised in both RNP and upstream React Native, still open on RNP, recurring question on Android 13/14/15 variations)

### 2. Background location permission requires foreground permission first, but users don't know
- **Pain:** On Android 11+, background location silently fails to return `GRANTED` unless foreground location was requested first in a separate dialog; there is no helper to orchestrate this two-step flow.
- **Source:** https://github.com/expo/expo/issues/16701 (closed, 15 comments, 3 reactions — maintainer explicitly said this is working-as-intended) and https://github.com/zoontek/react-native-permissions/issues/776
- **Frequency:** high (one of the most commented closed issues on expo/expo, still asked repeatedly)

### 3. One-time permissions (Android 11+) silently auto-revoke 30–60s after backgrounding
- **Pain:** Users grant "Only this time" for camera/mic/location, the app backgrounds, and on return the permission is gone with no event or callback — apps show a broken UI and users think the app is buggy.
- **Source:** https://github.com/zoontek/react-native-permissions/issues/527 (open feature request, Oct 2020, still open 5+ years later) and LogRocket/Reddit threads referenced in https://blog.logrocket.com/react-native-permissions/
- **Frequency:** high (open for 5+ years, the canonical "Android 11 auto revoke" ticket)

### 4. No way to detect iOS "Allow Once" vs "Allow While Using"
- **Pain:** iOS location's "Allow Once" returns `GRANTED` indistinguishably from "Allow While Using", but auto-revokes after the app is killed — apps cannot warn the user or gracefully re-ask.
- **Source:** https://github.com/zoontek/react-native-permissions/issues/964
- **Frequency:** medium (explicit feature request, recurring on SO via search)

### 5. iOS Limited photo library — no way to re-prompt the selection picker
- **Pain:** Once a user grants `LIMITED` photo access and selects 3 photos, there is no supported way (in RNP) to re-open the iOS system picker so they can add more photos — apps ship "Change Photo Selection" buttons that do nothing.
- **Source:** https://github.com/zoontek/react-native-permissions/issues/689 and https://github.com/zoontek/react-native-permissions/issues/612
- **Frequency:** medium (two separate tickets, third-party `expo-media-library` issues also reference it: https://github.com/expo/expo/issues/20207, https://github.com/expo/expo/issues/22251)

### 6. iOS limited contacts cannot be re-managed
- **Pain:** iOS 18 added limited contact selection, but no library exposes the API to let users update which contacts the app can see.
- **Source:** https://github.com/zoontek/react-native-permissions/issues/938 (open, March 2025, assigned to maintainer)
- **Frequency:** medium (explicit recent feature request, will compound as iOS 18 adoption grows)

### 7. Android 14 partial / limited photo access not surfaced
- **Pain:** Android 14 added its own "limited photo access" model, but RNP has no corresponding state and no way to trigger the OS "select more photos" flow — users get stuck with partial access and can't expand it.
- **Source:** https://github.com/zoontek/react-native-permissions/issues/959 (open, July 2025)
- **Frequency:** medium (open, Android 14 is mainstream now)

### 8. No getter for "settings-only" permissions
- **Pain:** Permissions like exact alarms, full-screen intent, notification listener, and accessibility services have no runtime prompt — users must be sent directly to a specific system settings page — but no library provides a unified "check + deep-link" helper.
- **Source:** https://github.com/zoontek/react-native-permissions/issues/762 (open since March 2023, still open)
- **Frequency:** medium (recurring request, comes up whenever someone ships alarm/calendar features)

### 9. `checkMultiple` on Android can never return `BLOCKED`
- **Pain:** To learn which permission is actually blocked on Android, you must call `requestMultiple` — which pops the system dialogs — creating an impossible UX where "pre-checking" blocked state requires re-prompting the user.
- **Source:** https://github.com/zoontek/react-native-permissions (README/docs explicit limitation) and surfaces in multi-permission SO threads
- **Frequency:** high (architectural limitation of the Android layer, affects every multi-permission flow)

### 10. Permission check returns stale value after user changes settings on Expo
- **Pain:** Expo permission modules only register new status on cold-start or on explicit `requestX` call; users who toggle permission in Settings and return to the app still see the old status until a manual re-request, which re-prompts.
- **Source:** https://github.com/expo/expo/issues/16701 and https://github.com/expo/expo/issues/22021
- **Frequency:** high (one of the most-linked expo permission tickets)

### 11. `requestPermission()` does nothing after user disabled permission in iOS Settings
- **Pain:** Expo `useCameraPermissions().requestPermission()` silently no-ops once the user has revoked permission via iOS Settings — there's no indication that the only path forward is `Linking.openSettings()`.
- **Source:** https://github.com/expo/expo/issues/28757
- **Frequency:** medium (closed as "works as designed" but users keep hitting it — no abstraction teaches the developer)

### 12. `useCameraPermissions` doesn't update after user grants in native prompt
- **Pain:** On first run, the native iOS camera prompt succeeds but the hook's state stays `denied`, so the `no permission` screen is shown even though permission is granted — forces a reload or second tap to unstick.
- **Source:** https://github.com/expo/expo/issues/28756
- **Frequency:** medium (closed, but the workaround the maintainers gave — "don't pass children to CameraView" — is a footgun)

### 13. Android notifications start at `denied` instead of `undetermined`
- **Pain:** On Android 13+, `Notifications.getPermissionsAsync()` returns `denied` for a fresh install where the user has never been asked, making "first-time" logic impossible without tracking state manually in storage.
- **Source:** https://github.com/expo/expo/issues/23908 and https://github.com/expo/expo/issues/19043
- **Frequency:** high (classic footgun, still tripping up new Expo users)

### 14. Android `canAskAgain` is always `true` for notifications
- **Pain:** `Notifications.getPermissionsAsync().canAskAgain` never flips to `false` on Android — so apps cannot detect when they should send the user to Settings and end up showing the system prompt uselessly.
- **Source:** https://github.com/expo/expo/issues/11481
- **Frequency:** medium

### 15. Android permission dialog dismissal returns `never_ask_again`
- **Pain:** If a user taps outside the Android permission dialog or presses back, the framework returns `never_ask_again` even though the permission is still requestable — apps correctly routing `never_ask_again` to Settings end up redirecting a user who hasn't even been asked.
- **Source:** https://github.com/facebook/react-native/issues/30158 (19 comments, 6 reactions, closed as "not planned")
- **Frequency:** high (upstream issue, still an active footgun across all RN permission libs)

### 16. Android 13 `POST_NOTIFICATIONS` `never_ask_again` on API <33
- **Pain:** Requesting `POST_NOTIFICATIONS` on devices <API 33 returns `never_ask_again` instead of `granted`, so apps that don't version-gate get stuck showing "go to settings" on older devices.
- **Source:** https://github.com/facebook/react-native/issues/36212 (closed, 10 comments, 5 reactions)
- **Frequency:** medium (fix is well-known but developers still hit it constantly because no library abstracts the version check)

### 17. Multi-target iOS apps can't share permission handlers
- **Pain:** Apps with an App Clip, a share extension, or a watchOS target can't configure RNP handlers per target — you end up with missing modules or duplicate prompts.
- **Source:** https://github.com/zoontek/react-native-permissions/issues/942 and https://github.com/zoontek/react-native-permissions/issues/965 (App Clip notifications)
- **Frequency:** low-medium (niche but recurring)

### 18. HealthKit / HomeKit / Google Fit not supported anywhere
- **Pain:** Apps that need health, fitness, or smart-home permissions have to bolt on additional native libraries and manage their own flow — there is no unified API, and the open issue has been sitting since 2018.
- **Source:** https://github.com/zoontek/react-native-permissions/issues/229 (health, open since Feb 2018) and https://github.com/zoontek/react-native-permissions/issues/800 (HomeKit, open)
- **Frequency:** medium (longest-open issue in RNP)

### 19. iOS 14 Local Network permission still unsupported
- **Pain:** RNP has never added iOS 14's Local Network permission; apps with Bonjour/AirPlay/Chromecast features must hand-roll native code.
- **Source:** https://github.com/zoontek/react-native-permissions/issues/509 (open since Sep 2020)
- **Frequency:** medium

### 20. App Tracking Transparency constantly returns `unavailable`
- **Pain:** Developers follow the RNP setup exactly, add `NSUserTrackingUsageDescription`, install the ATT pod — and ATT still reports `unavailable` on real devices.
- **Source:** https://github.com/zoontek/react-native-permissions/issues/576 and https://github.com/zoontek/react-native-permissions/issues/500
- **Frequency:** medium (high stakes — App Store rejections, Auth0 community thread also surfaces it)

### 21. Android 13 `openSettings` → notifications off causes full app restart
- **Pain:** On Android 13, toggling off notifications in the system settings while returning to the app causes the entire process to be killed and relaunched, losing in-memory navigation / form state.
- **Source:** https://github.com/zoontek/react-native-permissions/issues/747
- **Frequency:** medium

### 22. AppState `change` is triggered by the permission prompt itself, not just settings
- **Pain:** The system permission dialog briefly puts the app into `inactive`/`background` on iOS — naive AppState-based re-check flows fire on every prompt and create loops.
- **Source:** https://github.com/react-native-community/react-native-permissions/issues/436
- **Frequency:** medium (we already solve this by only re-checking after explicit `openSettings()`, but other libs still trip on it)

### 23. Expo-image-picker shows full library despite limited permission
- **Pain:** When iOS grants limited photo access, the Expo picker still displays the entire library in its picker UI instead of only the user-selected photos, breaking the user's trust model.
- **Source:** https://github.com/expo/expo/issues/35623 and https://github.com/expo/expo/issues/27117
- **Frequency:** medium

---

## Solved Poorly (10 items)

Pain that technically has an answer, but the answer is a workaround, a manual boilerplate the developer has to re-invent every time, or a footgun disguised as a feature.

### 1. Rationale / pre-prompt is Android-only and ships as a system alert
- **Pain:** RNP exposes a `rationale` argument, but it's Android-only, cannot be themed, and has no iOS equivalent — every app rolls its own pre-prompt UI.
- **Source:** https://github.com/react-native-community/react-native-permissions/issues/284 (open feature request for iOS rationale) and third-party packages like https://www.npmjs.com/package/react-native-permissions-ui filling the gap
- **Frequency:** high (the single most common thing third-party tutorials re-implement)

### 2. `openSettings()` returns a promise but tells you nothing useful
- **Pain:** The promise resolves when settings opens (or returns to app, depending on version), but there's no status update, no re-check, and no distinction between "user came back" vs "user stayed away" — developers have to wire AppState listeners manually.
- **Source:** https://github.com/zoontek/react-native-permissions/issues/82 and https://github.com/react-native-community/react-native-permissions/issues/392
- **Frequency:** high (one of the top 5 recurring SO/blog topics)

### 3. Camera and image request prompts twice
- **Pain:** When requesting `CAMERA` + `PHOTO_LIBRARY` together, iOS pops two dialogs back-to-back with no control over ordering, copy, or the gap between them.
- **Source:** https://github.com/zoontek/react-native-permissions/issues/638
- **Frequency:** medium

### 4. `requestMultiple` returns statuses in the wrong order
- **Pain:** The keyed-by-permission result map had an index mismatch bug that silently returned wrong statuses for each permission — a bug fixed in v5, but a symptom of how fragile DIY multi-permission flows are.
- **Source:** https://github.com/zoontek/react-native-permissions/issues/976
- **Frequency:** medium

### 5. `openSettings()` can't deep-link to a specific permission
- **Pain:** On iOS, `openSettings` opens the app's generic settings screen, not the location sub-page, even though the user's problem was specifically location — extra taps before recovery.
- **Source:** https://github.com/zoontek/react-native-permissions/issues/973
- **Frequency:** medium

### 6. Photo library returns `UNAVAILABLE` instead of `DENIED` after user disables
- **Pain:** On iOS, disabling photos in Settings flips RNP's response from `DENIED` to `UNAVAILABLE`, and apps treating `UNAVAILABLE` as "device doesn't support it" hide the feature permanently.
- **Source:** https://github.com/zoontek/react-native-permissions/issues/851 and https://github.com/zoontek/react-native-permissions/issues/873 and https://github.com/zoontek/react-native-permissions/issues/908
- **Frequency:** medium (3 distinct issues, same underlying confusion)

### 7. `PermissionsAndroid` → developers bypass the library entirely
- **Pain:** The built-in `PermissionsAndroid` ships with RN and is what most tutorials still teach, leading to hand-written `Platform.Version` branches, no iOS path, and no `blocked` abstraction — yet it's the "default" answer on SO.
- **Source:** https://reactnative.dev/docs/permissionsandroid and every Medium/LogRocket tutorial
- **Frequency:** high (most SEO'd "how do I handle permissions" answer is still this)

### 8. "No Permission Handler Detected" errors
- **Pain:** RNP requires editing the Podfile to opt-in to each handler; forgetting one permission throws a confusing runtime error that new developers cannot debug.
- **Source:** https://github.com/zoontek/react-native-permissions/issues/449 and https://github.com/zoontek/react-native-permissions/issues/515 and https://github.com/zoontek/react-native-permissions/issues/744
- **Frequency:** high (at least 3 separate duplicate issues, entire blog posts devoted to the fix, e.g. https://www.codestudy.net/blog/console-error-no-permission-handler-detected-react-native/)

### 9. Permission check returns `undetermined` instead of `denied` after user revokes
- **Pain:** On iOS, revoking permission in Settings makes RNP report `undetermined`, which conflicts with every state-machine that treats `undetermined` as "never asked".
- **Source:** https://github.com/zoontek/react-native-permissions/issues/295
- **Frequency:** low-medium

### 10. Bluetooth permission setup forces manifest/plist edits no one documents
- **Pain:** Android 12+ Bluetooth permissions (`BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, `BLUETOOTH_ADVERTISE`) require careful manifest edits and the RNP opt-in; missing one throws native crashes.
- **Source:** https://github.com/zoontek/react-native-permissions/issues/653 and https://github.com/dotintent/react-native-ble-plx/issues/1049
- **Frequency:** medium

---

## Already Solved By Us (7 items)

Short entries for positioning — these are pain points our v0.6.0 already handles, useful for marketing copy and to keep us from re-solving something solved.

### 1. Pre-prompt UX before the system dialog
- **Pain:** Developers have to hand-build a modal/screen before calling `request()` to avoid wasting the one-shot iOS dialog.
- **Source:** https://github.com/react-native-community/react-native-permissions/issues/284
- **Solved by:** `PermissionGate` + `DefaultPrePrompt` + `renderPrePrompt` prop.

### 2. Blocked recovery via Settings deep-link
- **Pain:** Detecting `blocked` and routing to Settings manually is boilerplate every app repeats.
- **Source:** https://github.com/zoontek/react-native-permissions/issues/82
- **Solved by:** `DefaultBlockedPrompt` + `openSettings` call integrated into the state machine.

### 3. AppState re-check only after `openSettings()`
- **Pain:** Naive AppState listeners re-check on every foreground, including the one right after the permission prompt itself, causing loops.
- **Source:** https://github.com/react-native-community/react-native-permissions/issues/436
- **Solved by:** state machine only triggers re-check after an explicit `openSettings` event.

### 4. iOS `LIMITED` state as a first-class flow
- **Pain:** `LIMITED` collapses into `GRANTED` in most libs, making "upgrade to full access" flows impossible to express.
- **Source:** v0.6.0 release notes; https://github.com/zoontek/react-native-permissions/issues/959
- **Solved by:** `isLimited` + `LimitedUpgradePrompt` component, distinct state in the state machine.

### 5. Multi-permission parity with per-permission handlers
- **Pain:** Multi-permission flows either fire all dialogs at once or force developers to sequence manually; `requestMultiple` returns statuses with no hook granularity.
- **Source:** https://github.com/zoontek/react-native-permissions/issues/976
- **Solved by:** `useMultiplePermissions` with per-permission handlers, `activePermission`, sequential/parallel flows, `blockedPermissions` array.

### 6. Dismissible blocked prompt + reset API
- **Pain:** Apps that show a blocked prompt and want the user to dismiss it (without immediately re-showing) have to build their own modal lifecycle.
- **Source:** Implicit in every SO thread about "how do I stop showing the permission modal on every focus"
- **Solved by:** `dismissBlocked()` + `reset()` hooks added in v0.4.0.

### 7. Declarative `PermissionGate` with `renderDenied`
- **Pain:** Permission-guarded screens mean every app invents its own `if (granted) { … } else { … }` ladder.
- **Source:** Pattern re-implemented in every tutorial (LogRocket, Medium, OneUptime)
- **Solved by:** `PermissionGate` component with `renderDenied`, `renderPrePrompt`, `renderBlocked`, `renderLimited` slots.

---

## Top 10 themes (ranked by frequency across the above)

These are the compounded themes — patterns that reappear across unsolved and solved-poorly items. Ranking is by how many distinct pain entries contribute to each theme and the strength of the frequency signal.

1. **Pre-prompt / rationale UX is DIY on iOS** — contributes to Unsolved #12, Solved-Poorly #1, #7. Every library punts on this and every app invents its own modal. Still the single highest-leverage gap in the ecosystem. (Already our headline feature.)

2. **Blocked-state recovery is boilerplate everywhere** — Unsolved #1, #11, Solved-Poorly #2, #5, #8. Developers have to write AppState + openSettings + re-check logic by hand, and the native layers lie to them (`never_ask_again` when dismissed, `undetermined` after revoke, `unavailable` after disable).

3. **Android post-dialog status is unreliable** — Unsolved #1, #13, #14, #15, #16, Solved-Poorly #4. The framework's `never_ask_again` / `canAskAgain` / `POST_NOTIFICATIONS` handling is a mess across API levels 31/33/34/35/36, and no library papers over it coherently. **Strongest roadmap signal for v0.7.0: an Android-status normalization layer.**

4. **Limited access UX (iOS Photos, iOS Contacts, Android 14 Photos) is a dead-end** — Unsolved #5, #6, #7, #23. Users land in `LIMITED` and can't expand without going to Settings; no library exposes the system "update selection" picker. We solve `LIMITED` state detection but not the update flow.

5. **One-time grants + Android auto-revoke surprise the developer** — Unsolved #3, #4. Users think the app is broken; there's no event, no timer, no "I expect this to have auto-revoked" helper. Pure whitespace.

6. **Permission check staleness after Settings return** — Unsolved #10, #11, #12. Expo hooks don't update; RNP requires a manual re-check; developers forget; footgun compounds in multi-permission flows. Our AppState re-check solves the RNP/native side but we don't wrap Expo hook staleness yet.

7. **Settings-only permissions (alarms, full-screen intent, notification listener, HealthKit, HomeKit, Local Network)** — Unsolved #8, #17, #18, #19. No runtime prompt, no unified API, no deep-link helper. A "settings-only permissions" plugin is a concrete v0.7.0 opportunity.

8. **Multi-permission sequencing and error surfaces** — Unsolved #9, Solved-Poorly #3, #4. Order, double-prompts, per-permission blocked state, Android's broken `checkMultiple`. We partially solve this with `useMultiplePermissions` but Android's "must request to see blocked" limitation is not yet papered over.

9. **Setup / installation cliffs** — Solved-Poorly #7, #8, #10. "No Permission Handler Detected", Podfile opt-ins, Bluetooth manifest edits, ATT `unavailable`. New developers bounce off the ecosystem before they hit our abstraction. A zero-config "preflight check" API could fire at runtime with actionable errors.

10. **Platform-version branching is everywhere and always wrong** — Unsolved #16, #2, and implicit in #13, #15. Developers miss `Platform.Version >= 33`, `>= 30`, `>= 29`, etc., and ship the wrong flow to a quarter of their users. A "permission capabilities" API keyed on permission + platform + OS version could make this impossible to forget.

---

**Summary counts:** 23 Unsolved + 10 Solved Poorly + 7 Already Solved By Us = 40 distinct pain points.
