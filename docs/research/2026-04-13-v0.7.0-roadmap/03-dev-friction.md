# Dev Friction Report — react-native-permission-handler v0.6.0

**Persona:** Mid-level React Native dev, first time using the library. References used: npm README, exported TypeScript types (`src/types.ts`, `src/index.ts`). No library internals read.

**Goal:** Implement 10 real-world permission scenarios and record every moment of friction. The more painful it feels, the more useful the v0.7.0 signal.

---

## Scenario 1 — Photo picker with iOS 14 limited access + "upgrade to full access" flow

**Goal:** User taps "Choose photo". On iOS 14+ we want to respect limited selection, but also offer an "Allow full access" upgrade path. On Android, just get read access to media.

**Attempted API:**

```tsx
import { usePermissionHandler, LimitedUpgradePrompt } from "react-native-permission-handler";
import { Permissions } from "react-native-permission-handler/rnp";

function PhotoPicker() {
  const photos = usePermissionHandler({
    permission: Permissions.PHOTO_LIBRARY,
    prePrompt: { title: "Photos", message: "Pick a photo to upload." },
    blockedPrompt: { title: "Photos Blocked", message: "Enable in Settings." },
  });

  if (photos.isGranted) return <Picker mode="full" />;
  // ??? how do I detect limited?
  return null;
}
```

**Friction:**

1. The README never mentions `limited` or `LimitedUpgradePrompt`. I only discovered `isLimited` and the `"limited"` status by reading `types.ts`. For a user who only reads the README, this feature is effectively invisible.
2. Having found `isLimited` on the return type, I still have no idea how to trigger the "upgrade to full access" system prompt. There's no `requestFullAccess` on `PermissionHandlerResult`. The types have an optional `requestFullAccess?` on `PermissionEngine`, but nothing surfaces it in the hook API. Do I call it via `engine` directly? How? The hook doesn't expose the resolved engine.
3. `LimitedUpgradePrompt` is exported from `index.ts` but completely undocumented. I had to guess that it's a modal. What props does it take? I'd need to read component source, which defeats the point.
4. The README's state machine diagram doesn't show a `limited` node, even though it's a documented `PermissionFlowState`. So I can't tell whether `limited` is a terminal state or whether I can transition back to `requesting` somehow.
5. CLAUDE.md says `isGranted` returns `true` for limited "for backward compatibility" — meaning my naive `if (photos.isGranted) return <Picker mode="full" />` silently renders full-mode UI even when only limited access was given. That's a footgun, and it's not visible in the README.
6. On Android there's no "limited" concept. I had to guess the hook just returns `granted` and the `isLimited` branch never fires. Fine, but I had to guess.

**Verdict:** Painful. The whole limited/upgrade flow — the headline v0.6.0 feature — has no README coverage and no obvious hook surface for triggering the upgrade.

---

## Scenario 2 — Background location for a delivery app

**Goal:** Courier app. On first launch of the delivery tab, ask for foreground location. After it's granted, ask for background location ("Always Allow") with a clear rationale.

**Attempted API:**

```tsx
const fg = usePermissionHandler({
  permission: Permissions.LOCATION_WHEN_IN_USE,
  prePrompt: { title: "Location", message: "To show nearby orders." },
  blockedPrompt: { title: "Blocked", message: "Enable in Settings." },
  onGrant: () => setAskBackground(true),
});

const bg = usePermissionHandler({
  permission: Permissions.LOCATION_ALWAYS,
  autoCheck: askBackground, // ???
  prePrompt: { title: "Background Location", message: "To track deliveries." },
  blockedPrompt: { title: "Blocked", message: "Enable in Settings." },
});
```

**Friction:**

1. `autoCheck` is a boolean, not reactive to a state change. If I start with `autoCheck: false` and flip it later, does the hook pick that up? No obvious way to say "don't start, then start". I'd have to manually call `bg.check()` inside `onGrant`, which means I need a ref to `bg` before `fg` is declared — classic ordering issue.
2. `useMultiplePermissions` with `"sequential"` sounds like the right fit, but the README's sequential example is camera+mic, which are peers. For location, iOS requires fg granted *before* the system even allows requesting "Always". Does the sequential strategy understand that dependency? The README doesn't say. I'd have to guess and test.
3. On iOS, requesting `LOCATION_ALWAYS` when `WHEN_IN_USE` is already granted doesn't show a new system dialog — it only sends the user to Settings via a banner. Does the library understand this? Will the hook get stuck in `requesting` forever? The `requestTimeout` section of the README mentions Android 16 hangs but says nothing about iOS Always-location semantics.
4. Android 10+ requires "foreground-only" to be requested first, and on Android 11+ the "Allow all the time" toggle is in Settings (no runtime prompt at all). The library's state machine has no hook for "this permission is only grantable via Settings" — `blocked` implies user action denied it, which is different.
5. `Permissions.LOCATION_ALWAYS` exists for both platforms in the constant list, but I don't know how it actually resolves on Android (there's no `ACCESS_BACKGROUND_LOCATION` in the Android-only list I saw).
6. No example in the README for sequential location flow. This is the single most common multi-step permission UX in mobile and it's absent.

**Verdict:** Painful. Technically the primitives are there, but the whole "fg-then-bg" ceremony is entirely on me and the library gives no guardrails.

---

## Scenario 3 — Post-onboarding notification opt-in

**Goal:** After onboarding, show a soft prompt ("Get notified when your friends post"). On confirm, trigger the iOS/Android 13 system dialog. On deny, remember and don't nag. On block, show a settings upsell later.

**Attempted API:**

```tsx
const notifs = usePermissionHandler({
  permission: "notifications",
  prePrompt: {
    title: "Stay in the loop",
    message: "We'll ping you when friends post or message.",
    confirmLabel: "Turn on",
    cancelLabel: "Maybe later",
  },
  blockedPrompt: { title: "Notifications off", message: "Enable in Settings." },
  onDeny: () => analytics.track("notif_denied"),
  onBlock: () => analytics.track("notif_blocked"),
});
```

**Friction:**

1. The README says "Pass `"notifications"` as the permission identifier" — but also shows `Permissions.NOTIFICATIONS`. Which one is idiomatic? I guessed the string, which matches the Expo engine's key.
2. The README mentions Android 13's `checkNotifications()` edge case and says "the RNP engine handles this". Good. But for Expo users using `createExpoEngine` + `expo-notifications`, does it also handle it? Not documented.
3. I want the pre-prompt to appear *after* onboarding finishes, not on mount. `autoCheck: false` is my only lever, and then I need to call `notifs.check()` manually. But from the state machine diagram, `check()` on an already-denied status leads to `prePrompt` — which is what I want. Still, the semantics of "autoCheck: false, then manually kick it off" aren't spelled out anywhere.
4. "Don't nag on deny" — there's no built-in "remember dismissal" option. I'd have to persist a flag to AsyncStorage myself and gate the hook call. Fine, but a `rememberDismissal` option (with TTL) would be a nice convenience.
5. `dismissBlocked` and `reset` are in the types but not in the README API reference. I initially thought the blocked modal was dismissible only via Settings. The README's `PermissionHandlerResult` example even omits them. This makes "I'll show the blocked modal as a non-modal banner" impossible to reason about without type spelunking.

**Verdict:** Workable. The common case works; the polish (remember deny, soft banner) is DIY.

---

## Scenario 4 — Camera for KYC / document scanning with a "why we need this" screen

**Goal:** Full-screen branded explanation before the system camera dialog. No modals.

**Attempted API:**

```tsx
function KycCameraIntro() {
  const camera = usePermissionHandler({
    permission: Permissions.CAMERA,
    autoCheck: true,
    prePrompt: { title: "", message: "" }, // unused, I render my own UI
    blockedPrompt: { title: "Enable camera", message: "Go to Settings." },
  });

  if (camera.state === "prePrompt") {
    return (
      <FullScreenKycIntro onAllow={camera.request} onSkip={camera.dismiss} />
    );
  }
  if (camera.isGranted) return <KycScanner />;
  return <LoadingSpinner />;
}
```

**Friction:**

1. The hook *always* requires `prePrompt: { title, message }`. Both are required strings. If I'm rendering my own UI and never using the default modal, I'm still forced to pass dummy strings. A `prePrompt?: PrePromptConfig | false` would be cleaner.
2. The default modal is rendered *by the hook*. Wait — is it? Reading the README more carefully: "Pre-prompt and blocked modals are rendered by the hook's default UI." So if I return `<FullScreenKycIntro>` from my component while `state === "prePrompt"`, does the default modal *also* render on top? Unclear. I'd have to test. This is a critical ambiguity for "I want full UI control" users.
3. I can't find an opt-out flag like `renderDefaults: false` or `suppressDefaultUI`. `PermissionGate` has `renderPrePrompt` / `renderBlockedPrompt` overrides, but `usePermissionHandler` doesn't. So for full-screen takeover UIs, I may be forced to switch to `PermissionGate`, which doesn't fit KYC (I need imperative control over the flow, not declarative gating).
4. The KYC flow usually wants to trigger the camera request from a specific button deep in the onboarding flow, not on screen mount. Having `autoCheck: false` works, but then the state stays `idle` and I call `check()` manually — and the state machine goes `idle → checking → prePrompt` before `requesting`. There's no "skip pre-prompt, go straight to request" escape hatch. (On iOS that's a bad idea anyway, but for Android it's often fine.)

**Verdict:** Workable for the default path, Painful if you want full visual takeover.

---

## Scenario 5 — Mic for voice notes with inline record button

**Goal:** User taps a mic icon in a chat composer. First tap: pre-prompt inline (not modal). Second tap after grant: start recording.

**Attempted API:**

```tsx
const mic = usePermissionHandler({
  permission: Permissions.MICROPHONE,
  autoCheck: false,
  prePrompt: { title: "Mic", message: "Tap to record voice notes." },
  blockedPrompt: { title: "Mic Blocked", message: "Enable in Settings." },
});

function onMicPress() {
  if (mic.isGranted) return startRecording();
  mic.check(); // will set state → prePrompt → (modal shows)
}
```

**Friction:**

1. Same issue as Scenario 4: I wanted an *inline* pre-prompt (a little popover anchored to the mic button), not a centered modal. The library renders its own default modal and I can't stop it without (probably) switching to `PermissionGate` or building a custom render prop.
2. `PermissionGate` has `renderPrePrompt` but `usePermissionHandler` doesn't. For an imperative "tap to record" UX, `PermissionGate` doesn't fit — gates are for protected screens, not actions.
3. The one-tap-to-ask-then-record pattern (common in iMessage, WhatsApp) is awkward: I have to press once to move `idle → prePrompt`, then press again on the modal to actually fire the system dialog. Native apps do it in one tap. There's no "skip pre-prompt if the OS is about to show its own dialog anyway" mode.
4. `Permissions.MICROPHONE` on Android maps to `RECORD_AUDIO`. Good, the README documents this. No friction here.

**Verdict:** Workable. Default flow works; inline UX is fightable but annoying.

---

## Scenario 6 — Contacts for an invite-friends flow

**Goal:** "Find friends who are already on the app." On tap, ask for contacts, then hit the matching API.

**Attempted API:**

```tsx
const contacts = usePermissionHandler({
  permission: Permissions.CONTACTS,
  autoCheck: false,
  prePrompt: {
    title: "Find friends",
    message: "We'll look up which contacts already have an account.",
  },
  blockedPrompt: { title: "Contacts off", message: "Enable in Settings." },
  onGrant: () => matchContacts(),
});

<Button title="Find Friends" onPress={contacts.check} />
```

**Friction:**

1. `onGrant` firing at the right moment is the thing I care about. Does it fire only on fresh grant, or also when `check()` finds the permission already granted? The README doesn't clarify. For an invite flow I want it to fire in both cases (so I can kick off the match job). If it only fires on state transition into `granted`, I'm fine as long as the mount-time check also counts; if it fires only after a successful *request*, I need a separate `useEffect` on `isGranted`.
2. iOS 18 adds "limited contacts" (user can choose specific contacts). Does this library surface it? The `PermissionStatus` type has `"limited"` — is that only photos, or also contacts? No documentation. This is a subtle but important point for an invite-flow UX.
3. Android needs `READ_CONTACTS`; the library maps `Permissions.CONTACTS` cross-platform. Fine.

**Verdict:** Workable. The iOS 18 limited-contacts ambiguity is the only real concern, and it's a documentation gap rather than a code gap.

---

## Scenario 7 — Calendar access for a booking app

**Goal:** When a user books an appointment, write it to their calendar. iOS 17+ has separate read/write scopes.

**Attempted API:**

```tsx
const calendar = usePermissionHandler({
  permission: Permissions.CALENDARS_WRITE_ONLY, // iOS 17+
  prePrompt: { title: "Add to Calendar", message: "Save your booking." },
  blockedPrompt: { title: "Calendar off", message: "Enable in Settings." },
});
```

**Friction:**

1. README lists both `CALENDARS` and `CALENDARS_WRITE_ONLY`. For iOS 17+ the write-only scope is the right one. But on Android there's no distinction — does `CALENDARS_WRITE_ONLY` silently resolve to `WRITE_CALENDAR`? Or does it return `unavailable` on Android? The README says "Cross-platform permissions resolve to the correct platform string at runtime via `Platform.select`" but gives no mapping table for the edge cases.
2. iOS 16 and earlier only knows full `CALENDARS`. The library has no concept of "use write-only on iOS 17+, fall back to full on iOS 16". I'd need to branch on `Platform.Version` manually, which means two hook calls and a lot of glue. A `preferredScope` helper would be nice.
3. No example in the README for write-only scopes.

**Verdict:** Workable but DIY-heavy.

---

## Scenario 8 — Bluetooth for IoT device pairing

**Goal:** Scan and connect to a smart device. Android 12+ needs `BLUETOOTH_SCAN` + `BLUETOOTH_CONNECT` (runtime). iOS needs `NSBluetoothAlwaysUsageDescription` (plist, not runtime) but the first scan triggers a dialog.

**Attempted API:**

```tsx
const bt = useMultiplePermissions({
  permissions: [
    { permission: Permissions.ANDROID.BLUETOOTH_SCAN, prePrompt: {...}, blockedPrompt: {...} },
    { permission: Permissions.ANDROID.BLUETOOTH_ADVERTISE, prePrompt: {...}, blockedPrompt: {...} },
    // iOS?
    { permission: Permissions.BLUETOOTH, prePrompt: {...}, blockedPrompt: {...} },
  ],
  strategy: "parallel",
});
```

**Friction:**

1. Platform-conditional permission arrays are a pain. I want "on Android ask for scan+connect, on iOS ask for BLUETOOTH". I have to manually branch the permissions array on `Platform.OS`. No helper like `Permissions.BLUETOOTH_BUNDLE` that expands per platform.
2. The README's Android-only constants list `BLUETOOTH_SCAN` and `BLUETOOTH_ADVERTISE` but not `BLUETOOTH_CONNECT`. Is that an oversight or intentional? (Also: Android 12+ actually needs `BLUETOOTH_CONNECT` for most apps.)
3. `Permissions.BLUETOOTH` — what does this resolve to on iOS? Probably `ios.permission.BLUETOOTH`, but there's no runtime dialog for BT on iOS in most app types; the prompt is triggered by first CoreBluetooth access. So the hook might sit in `checking → granted` forever even when the user hasn't seen a dialog. Unclear how the flow maps to reality.
4. Multi-permission strategy "parallel" — does it show three pre-prompts at once? Three modals stacked? One at a time? Not documented. I'd have to test.

**Verdict:** Painful. Bluetooth is always hairy, but the library gives zero platform guidance.

---

## Scenario 9 — Health data (HealthKit / Google Fit) read permissions

**Goal:** Read step count + heart rate.

**Attempted API:**

```tsx
// ???
```

**Friction:**

1. HealthKit has a completely different permission model from everything else: per-data-type authorization, no "blocked" concept (Apple explicitly won't tell your app if the user denied), and no `openSettings` deep link to the right pane. The library's `PermissionEngine` interface has no concept of per-scope permissions or "unknown" status.
2. `react-native-permissions` doesn't cover HealthKit either — you need `react-native-health` or similar. So for this scenario the user *must* write a custom `PermissionEngine`. That's fine in theory, but the README's custom-engine example is three lines long and doesn't cover edge cases like "status is unknowable" or "permission is granted per-scope".
3. The `PermissionStatus` union has no `"unknown"` value. HealthKit's entire design says "we will not tell you if the user denied". What do I return? `"granted"` and hope? `"denied"` and lie? Neither is right.
4. Google Fit on Android has a similar problem (OAuth scopes, not runtime permissions). Also won't fit.
5. Conclusion for a first-time user: "this library doesn't do health." Which is fine, but nowhere does the README say so. I'd waste an afternoon figuring out the custom engine was still the wrong abstraction.

**Verdict:** Blocked. The abstraction doesn't match the domain, and the README doesn't warn me.

---

## Scenario 10 — Multi-permission onboarding wall (camera + mic + notifications)

**Goal:** After onboarding, user must grant all three to proceed. If any is denied, show a "we need this to continue" screen with per-permission status and retry buttons.

**Attempted API:**

```tsx
const perms = useMultiplePermissions({
  permissions: [
    { permission: Permissions.CAMERA, prePrompt: {...}, blockedPrompt: {...} },
    { permission: Permissions.MICROPHONE, prePrompt: {...}, blockedPrompt: {...} },
    { permission: "notifications", prePrompt: {...}, blockedPrompt: {...} },
  ],
  strategy: "sequential",
  onAllGranted: () => nav.navigate("Home"),
});

return (
  <View>
    <Row label="Camera" state={perms.statuses[Permissions.CAMERA]} />
    <Row label="Mic" state={perms.statuses[Permissions.MICROPHONE]} />
    <Row label="Notifications" state={perms.statuses["notifications"]} />
    <Button title="Continue" onPress={perms.request} />
  </View>
);
```

**Friction:**

1. `statuses` is keyed by the permission identifier. For cross-platform `Permissions.CAMERA` that's `"ios.permission.CAMERA"` on iOS and `"android.permission.CAMERA"` on Android. My row indexing becomes platform-specific if I use the constant directly — I have to do `Platform.select` everywhere, or define local aliases. Annoying.
2. The README's `MultiplePermissionsResult` example only shows `statuses`, `allGranted`, `request`. The types also expose `handlers` (per-permission imperative controls), `activePermission`, `blockedPermissions`, and `reset`. None of those are in the README. For this scenario I really want `handlers[Permissions.CAMERA].openSettings()` to retry a single blocked permission — and I only know it exists because I read the type file.
3. Sequential strategy + user denies #2: what happens? Does it stop? Keep going? The README says "sequential: ask one at a time, stop on denial/block" — OK, but then how do I *resume* from #2 after the user unblocks in Settings? Call `request()` again? Does it restart from the beginning or pick up where it stopped? Not documented.
4. `activePermission: string | null` in the types hints at "the one currently being asked". Great, I can highlight the active row — but without README docs I'd never know to use it.
5. `reset()` in the types: resets what? All permissions, or just the active one? No docs.
6. "User must grant all to proceed" means I want a forceful UI that blocks navigation until `allGranted`. The library handles the state but not the "wall" UX — I build that myself. Fine, but a `<PermissionsWall permissions={...}>` component would be a great v0.7.0 addition.

**Verdict:** Workable. The multi-permission primitives exist, but half of them are undocumented, and common onboarding needs (retry one, resume sequential, per-row state) require reading the type file.

---

## Top Friction Themes (ranked by frequency across scenarios)

1. **README undersells the actual API.** `dismissBlocked`, `reset`, `isLimited`, `handlers`, `activePermission`, `blockedPermissions`, `LimitedUpgradePrompt`, `requestFullAccess`, `onSettingsReturn`, `debug` function form — all exist in `src/types.ts`/`src/index.ts` and are invisible in the README. A user who reads only the npm page walks away thinking the library is ~60% of what it actually is. **Hit in scenarios 1, 3, 10 directly; indirectly in 4, 5, 6.**

2. **No escape hatch for "I want to render my own UI, not the default modal."** `usePermissionHandler` always renders the default pre-prompt/blocked modal. `PermissionGate` has render props, but the imperative hook doesn't. There's no `suppressDefaultUI` or `renderPrePrompt` option on the hook, which makes full-screen takeovers and inline popovers awkward to reason about (does the default modal render on top of mine?). **Hit in scenarios 1, 4, 5.**

3. **Limited/partial-access story is incomplete.** `"limited"` exists in the status union, `isLimited` is on the result, `LimitedUpgradePrompt` is exported, and `requestFullAccess` is on the engine — but none of it connects. There's no `requestFullAccess()` on the hook result, no docs on when `isLimited` is `true`, and `isGranted` silently returns `true` for limited (footgun). The flagship v0.6.0 feature feels half-wired. **Hit in scenarios 1, 6.**

4. **Platform-specific sequencing and dependencies are on the user.** Foreground-then-background location, iOS 17 calendar write-only fallback, Android 12+ bluetooth bundles, iOS HealthKit "can't tell if denied" — the library gives me primitives but no platform-aware helpers or bundles. "Sequential" strategy is only a loop, not a dependency graph. **Hit in scenarios 2, 7, 8, 9.**

5. **Multi-permission ergonomics around resume / retry / per-permission control are undocumented.** Sequential flow after a denial: does retry restart or resume? Per-permission `handlers[x].openSettings()` is hidden. `statuses` keyed by platform-specific string makes cross-platform indexing annoying. No `<PermissionsWall>` convenience for the onboarding-wall pattern. **Hit in scenarios 2, 8, 10.**

---

**Total verdict distribution:** Smooth 0 / Workable 5 / Painful 4 / Blocked 1
