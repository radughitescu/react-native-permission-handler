# API Reference

Canonical reference for every public export of `react-native-permission-handler`. Each page below
documents one API surface with its full type signature, the behavior of each field, and at least
one runnable example.

If you are new to the library, read the top-level [README](../../README.md) first — it contains the
state machine diagram and a quick-start walkthrough. The pages here are intended as a lookup
reference, not a tutorial.

## Hooks

- [`usePermissionHandler`](./use-permission-handler.md) — the single-permission lifecycle hook.
- [`useMultiplePermissions`](./use-multiple-permissions.md) — parallel or sequential multi-permission
  orchestration with per-permission handlers.

## Components

- [`PermissionGate` and default prompts](./permission-gate.md) — declarative gate component plus
  `DefaultPrePrompt`, `DefaultBlockedPrompt`, and `LimitedUpgradePrompt`.

## Engines

- [Engines and engine resolution](./engines.md) — the `PermissionEngine` interface,
  `createRNPEngine`, `createExpoEngine`, `createTestingEngine`, `createNoopEngine`,
  `setDefaultEngine`, and resolution order.

## Types and constants

- [Types, flow states, and `Permissions`](./types.md) — `PermissionStatus`, the 12
  `PermissionFlowState` values, `PermissionFlowEvent`, and the `Permissions` constants index
  including `Permissions.BUNDLES`.

## Recipes

For end-to-end solutions to real problems (background location, onboarding walls, limited photo
upgrade, testing, Android normalization, etc.), see the [recipes index](../recipes/README.md).
