# Competitor Architectural Survey

_Date: 2026-04-13. Scope: architectural patterns, not feature lists._

## Summary

- Almost every competitor models permission status as a **flat enum** (3–5 values). None ship a formal state machine with explicit transitions. Our state machine is the clearest architectural differentiator.
- **No competitor in this space has a pluggable engine/adapter layer.** Every library either owns the native code (RNP, Expo modules, PermissionsKit, Dexter) or is hard-wired to one backend (the few wrapper-hook libs are RNP-only). A portable, engine-agnostic JS core is a unique position.
- **Declarative permission gating components are vanishingly rare.** Most libraries expose imperative APIs or raw hooks and leave UI composition to the caller. Of the handful that do ship components (delba/Permission's `PermissionButton`, Dexter's pre-built listener dialogs, SPPermissions' sheet), none are React components and none are reactive to AppState/foreground re-check.
- **iOS `LIMITED` is almost universally collapsed into `GRANTED`** — RNP is the only direct competitor exposing it as a distinct status, and even RNP provides no upgrade-flow scaffolding. Our `isLimited` + `LimitedUpgradePrompt` combo appears to be unique.
- **Android 2-denial auto-block is handled only at the status-read level** (libraries surface `BLOCKED`/`canAskAgain=false`); none of the surveyed libraries drive a recovery flow (blocked prompt → Settings → foreground re-check) the way our state machine does.
- The mature native-iOS "pre-prompt" libraries (PermissionScope, delba/Permission, SPPermissions/PermissionsKit) are **all either archived or in maintenance mode** and predate iOS 14 limited photo access, notifications auto-block semantics, and modern reactive UIs. There is a clear generational gap on RN.

---

## react-native-permissions (zoontek)

- ~4.4k stars, active (commits into 2025), ~844 commits. The de facto RN permissions primitive.
- **State model:** flat frozen enum `RESULTS = { UNAVAILABLE, BLOCKED, DENIED, GRANTED, LIMITED }` (`src/results.ts`). No transition logic — status is a single read returned from the native side. `PermissionStatus = ValueOf<ResultMap>`.
- **Engine/adapter layer:** none. Native modules per platform (`ios/`, `android/`, `windows/`) are tightly coupled to the JS entry points; cross-platform variation is handled via `methods.ios.ts` / `methods.android.ts` / `methods.windows.ts` files selected at bundle time. Notifications are a separate code path (`checkNotifications`/`requestNotifications`) because they don't fit the generic permission shape.
- **iOS limited handling:** surfaces `LIMITED` as a first-class status value, plus a `PhotoLibraryAddOnly` permission string. No upgrade-prompt UI, no helper to drive re-prompt, no "is this photo set still sufficient" flow.
- **Android blocked handling:** returns `BLOCKED` from `check()` when the OS has auto-blocked after two denials; caller is expected to call `openSettings()` manually. No AppState integration, no recovery orchestration.
- **Declarative components:** none. Pure imperative API (`check`, `request`, `checkMultiple`, `requestMultiple`, `openSettings`). UI is the app's problem.
- **Architectural notes:** The README explicitly frames itself as a primitive, not a UX framework. Test visibility from the `src/` listing is minimal — no colocated `*.test.ts` files; testing appears to happen through the example app / platform integration rather than unit tests on the JS layer. This is exactly the seam our library fills — RNP gives you a number, we give you the flow.
- **Source:** https://github.com/zoontek/react-native-permissions

## Expo permission modules (expo-camera, expo-location, expo-media-library, expo-notifications)

- Part of the Expo SDK monorepo; first-party, continuously maintained, very high usage.
- **State model:** shared `PermissionResponse` shape across modules: `{ status: 'granted' | 'denied' | 'undetermined', granted: boolean, canAskAgain: boolean, expires: 'never' | number }`. Three-value enum per module, no `BLOCKED` or `LIMITED` distinction surfaced at the type level — "blocked" collapses into `denied + canAskAgain=false`; iOS 14 limited photo access is collapsed into `granted` with an `accessPrivileges` side-channel on `expo-media-library`.
- **Engine/adapter layer:** the engine _is_ the module. Each permission ships its own hook (`useCameraPermissions`, `useForegroundPermissions`, `useMediaLibraryPermissions`, `useNotifications`-style). No cross-module coordination, no shared orchestrator. There is no equivalent to our `PermissionEngine` interface — if you want to swap backends you'd write glue in app code.
- **iOS limited handling:** `expo-media-library` exposes `accessPrivileges: 'all' | 'limited' | 'none'` alongside `granted`. No upgrade flow, no dedicated limited state in the core enum.
- **Android blocked handling:** surfaced only via `canAskAgain=false`. Recovery is caller-driven.
- **Declarative components:** none. The documented pattern is `const [permission, requestPermission] = useCameraPermissions();` plus conditional JSX in the caller.
- **Architectural notes:** Expo's design optimizes for per-feature isolation — each module is self-contained. This is great for tree-shaking but leaves the UX story (pre-prompts, blocked recovery, multi-permission sequencing, limited-access upgrades) entirely to the app developer. Our Expo engine (`src/engines/expo.ts`) exploits exactly this gap.
- **Source:** https://github.com/expo/expo (packages/expo-camera, expo-location, expo-media-library, expo-notifications)

## react-native-permissions-hooks (relaypro-open)

- **0 stars, 13 commits, no releases, no recent activity** — effectively abandoned / never launched. Included for completeness since the user asked.
- **State model:** thin wrapper around RNP statuses; no original state modelling.
- **Engine/adapter layer:** hard-wired to `react-native-permissions`.
- **iOS limited / Android blocked:** no special handling surfaced; inherits whatever RNP returns.
- **Declarative components:** none visible.
- **Architectural notes:** Occupies the same niche we do but never reached the hook-parity, let alone components. Confirms the niche is under-served.
- **Source:** https://github.com/relaypro-open/react-native-permissions-hooks

## PermissionScope (nickoneill)

- 4.8k stars, **archived Feb 2019**, Swift 3 / iOS 9 era. Historically influential.
- **State model:** flat enum `{ Unknown, Authorized, Unauthorized, Disabled }`. No state machine.
- **Engine/adapter layer:** none; tight coupling to individual iOS frameworks (`CLLocationManager`, `CNContactStore`, etc.).
- **iOS limited handling:** predates iOS 14 — no limited photos concept.
- **Android blocked:** iOS-only.
- **Declarative components:** yes — the library's main value prop was a ready-made modal `PermissionScope` view controller that walked the user through multiple permissions with pre-prompts, callbacks (`onAuthChange`, `onCancel`, `onDisabledOrDenied`). This is the spiritual ancestor of our `PermissionGate` + `DefaultPrePrompt` pattern, but imperative UIKit.
- **Architectural notes:** Dialog-driven rather than reactive; one big controller holds all permission state. The archived status and explicit "needs iOS 10+ alternative" note in the README signals the pattern is ripe for a modern reimagining.
- **Source:** https://github.com/nickoneill/PermissionScope

## SPPermissions / PermissionsKit (sparrowcode)

- ~5.8k stars, **actively maintained** (iOS 12+, UIKit + SwiftUI), 1241 commits.
- **State model:** three values — `authorized`, `denied`, `notDetermined`. No state machine. State is read on-demand (`Permission.notification.authorized`), not observed.
- **Engine/adapter layer:** modular per-permission subspecs so apps don't link APIs they don't use (an App Store review concern). Not an adapter layer in our sense — still tightly coupled to iOS frameworks. No swappable backend.
- **iOS limited handling:** not surfaced as a distinct state at the enum level; the photo module has options but the core status collapses to `authorized`.
- **Android blocked:** iOS-only.
- **Declarative components:** ships pre-built bottom-sheet / dialog / list UIs (`SPPermissionsDialogController`, etc.) that can be presented with one call. This is the closest architectural analog to `PermissionGate` in the iOS ecosystem, but imperative and view-controller shaped.
- **Architectural notes:** Modular subspec design is a smart decoupling pattern, aimed at compilation and App Store review rather than runtime pluggability. Reactive binding is absent.
- **Source:** https://github.com/sparrowcode/PermissionsKit

## delba/Permission

- 2.9k stars, last commit 2019 (maintenance mode).
- **State model:** enum `{ authorized, denied, disabled, notDetermined }`.
- **Engine/adapter layer:** none.
- **iOS limited handling:** predates iOS 14.
- **Declarative components:** uniquely for this era, ships `PermissionButton` — a `UIButton` subclass that reacts to status changes, plus `PermissionSet` for grouping. This is the most reactive of the native iOS libraries surveyed: the button's title/enabled state auto-updates as permission status changes. It's the nearest ancestor of a "reactive gate component" pattern we've seen outside our own library.
- **Architectural notes:** The `PermissionSet` abstraction for multi-permission coordination is conceptually similar to our `useMultiplePermissions`, but implemented as a flat collection with a delegate, not a state machine.
- **Source:** https://github.com/delba/Permission

## JLPermissions (jlaws)

- Repo returns HTTP 404 at https://github.com/jlaws/JLPermissions — **deleted or moved** (a fork exists at VincentSit/JLPermissions). Historically an iOS pre-permissions utility (calendar, contacts, location, photos, reminders, Twitter, push) using per-permission subspecs. Architecture circa 2014 — callback-driven, no state machine, no reactive UI. Listed here only as historical context; not a live competitor.
- **Source:** https://github.com/jlaws/JLPermissions (404), https://github.com/VincentSit/JLPermissions (fork)

## Dexter (Karumi)

- 5.2k stars, **archived July 2021**. Still widely referenced but dead.
- **State model:** callback/listener based — `PermissionListener`, `MultiplePermissionsListener`. Status reported via `PermissionGrantedResponse` / `PermissionDeniedResponse` objects. No enum of intermediate states, no state machine; state is transient, delivered once per request.
- **Engine/adapter layer:** none — Android-only, wraps `ActivityCompat.requestPermissions`.
- **Android blocked handling:** exposes `isPermanentlyDenied()` on the denied response; does not drive a recovery flow. A `PermissionToken` primitive pauses the flow so the caller can show rationale before continuing — an interesting pattern (explicit continuation token) but it's about rationale, not about foreground-return re-check.
- **Declarative components:** ships pre-built listeners like `DialogOnDeniedPermissionListener`, `SnackbarOnDeniedPermissionListener`, and a `CompositePermissionListener` for chaining. These are behavioural components, not UI components, but they're the closest thing to declarative in the Android space. The composite listener pattern (chainable, each listener independent) is architecturally interesting.
- **Architectural notes:** Listener composition is worth studying — it's how Dexter achieved separation of "what to do on denied" from "what to do on granted" without inheritance. Our equivalent today is prop drilling into `PermissionGate`; a composable listener/middleware pattern could be a v0.7 direction.
- **Source:** https://github.com/Karumi/Dexter

## PermissionsDispatcher

- 11.2k stars (by far the highest in this survey), last release 4.8.0 (March 2021), maintained but infrequent.
- **State model:** no runtime state model at all — the library is a **Kotlin/Java annotation processor** that generates wrapper functions at compile time. `@RuntimePermissions`, `@NeedsPermission`, `@OnShowRationale`, `@OnPermissionDenied`, `@OnNeverAskAgain`. The "state" is implicit in which generated method gets invoked.
- **Engine/adapter layer:** none; Android-only, codegen around `ActivityCompat`.
- **Android blocked handling:** `@OnNeverAskAgain` is a dedicated hook for the 2-denial case. The library also generates `processXxxProcessRequest` / `cancelXxxProcessRequest` methods so the developer can continue or abort after rationale. This is the cleanest rationale-continuation pattern in the survey.
- **Declarative components:** none — the abstraction lives at the method-annotation level, not the UI level.
- **Architectural notes:** Compile-time codegen is a radically different architecture from everything else here. It forces developers to declare permission needs statically at call sites, which has real ergonomic benefits (the compiler can verify you handled all four outcomes) but is impossible to replicate in a JS library without a Babel plugin. Worth noting as a design reference: "force exhaustiveness" is a UX property we could achieve instead through TypeScript discriminated unions on the state machine.
- **Source:** https://github.com/permissions-dispatcher/PermissionsDispatcher

## Web Permissions API wrappers (react-use-permissions, @custom-react-hooks/use-permission, etc.)

- Small libraries (11–1k stars), mostly unmaintained. `sergiodxa/react-use-permissions` is **archived July 2020, 11 stars**.
- **State model:** minimal — typically `true | false | null` or the raw `PermissionState` from the browser Permissions API (`'granted' | 'denied' | 'prompt'`). No state machine.
- **Engine/adapter layer:** n/a — the engine is the browser.
- **Limited/blocked:** web platform has no equivalent.
- **Declarative components:** none in the RN-applicable libraries surveyed.
- **Architectural notes:** These are essentially one-hook wrappers around `navigator.permissions.query()`. They're interesting only as evidence that even the web ecosystem — where the Permissions API _does_ emit change events — has not produced a declarative `<PermissionGate>` component at any scale. The niche is genuinely empty.
- **Source:** https://github.com/sergiodxa/react-use-permissions, https://www.npmjs.com/package/@custom-react-hooks/use-permission

---

## Cross-cutting observations

**Everybody models state as an enum; nobody models transitions.** The universal pattern is "call `check()`, get one of 3–5 values, branch on it." This is fine for single-shot checks but falls apart for multi-step UX (pre-prompt → system dialog → blocked → Settings redirect → foreground re-check → limited upgrade). Every library we surveyed pushes the transition logic into the app, and every app reinvents it badly. Our decision to model flows as a state machine with explicit events is not just an implementation detail — it's the primary architectural moat, and it's defensible because nobody else has it. The closest analogs (PermissionScope's controller-driven walkthrough, PermissionsDispatcher's annotation-generated outcomes) are both compile-time or imperative, not runtime-reactive. A TypeScript-first discriminated-union state type is a property we should lean into harder in v0.7 (exhaustive switching, `isGranted`/`isLimited`/`isBlocked` guards) — it's how we get the "compiler forces you to handle all outcomes" ergonomics of PermissionsDispatcher in a JS-native way.

**The adapter layer is genuinely unique and strategically important.** No RN permissions library has a pluggable engine. Native iOS libraries couple to CoreLocation/AVFoundation directly; Android libraries couple to `ActivityCompat`; Expo modules each own their own native code; RNP has one fixed C++/Obj-C/Java implementation. Our `PermissionEngine` interface with RNP, Expo, noop, and testing adapters is a category of its own. The implication for v0.7: doubling down on the engine surface (formalizing it, documenting custom-engine authoring, shipping more first-party adapters — Capacitor? Tauri? expo-modules-core direct?) is a low-cost, high-differentiation bet because nobody can easily catch up without rewriting their core. The testing engine in particular has no analog anywhere in the survey; competitors recommend `vi.mock('react-native-permissions')` as their testing story.

**Declarative components plus reactive re-check is the unfilled slot.** Only three libraries in the whole survey ship anything resembling a reactive component: delba/Permission's `PermissionButton` (UIKit, archived), PermissionScope's modal controller (UIKit, archived), and SPPermissions' bottom-sheet (UIKit, maintained). Zero on the RN/React side. Our `PermissionGate` is in a blue-ocean category. The gap to exploit: none of the existing components integrate with AppState / foreground re-check, none handle the iOS 14 limited-access upgrade flow, and none compose cleanly with multi-permission sequencing. A v0.7 direction worth considering is a **Dexter-style composable middleware/listener layer** underneath `PermissionGate` — so `onBlocked`, `onLimited`, `onGranted` side effects can be composed without prop-drilling. Dexter's `CompositePermissionListener` is the precedent; we'd do it React-idiomatically (hooks/context) rather than with listener classes.
