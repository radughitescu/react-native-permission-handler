# Recipe: testing with `createTestingEngine`

**Problem.** You're writing unit tests for a screen that uses `usePermissionHandler` or
`PermissionGate`. You don't want to `vi.mock("react-native-permissions")` or fight TurboModules —
you just want to drive the hook's state machine through a fake engine with known statuses.

**Solution.** Use `createTestingEngine`. It implements the `PermissionEngine` interface with a
controllable in-memory status map and a request history for assertions.

## What you'll use

- [`createTestingEngine`](../api/engines.md#createtestingengineinitialstatuses) — from
  `react-native-permission-handler/testing`
- Pass the engine via the `engine` prop on your hook or component. No global state, no mocks.

## Basic unit test (Vitest + react-test-renderer)

```tsx
import { act, create } from "react-test-renderer";
import { describe, expect, it } from "vitest";
import { usePermissionHandler } from "react-native-permission-handler";
import { createTestingEngine } from "react-native-permission-handler/testing";

function CameraScreen({ engine }: { engine: ReturnType<typeof createTestingEngine> }) {
  const camera = usePermissionHandler({
    engine,
    permission: "camera",
    prePrompt: { title: "Camera", message: "…" },
    blockedPrompt: { title: "Blocked", message: "…" },
  });
  return null;
}

describe("camera flow", () => {
  it("transitions denied -> prePrompt -> granted", async () => {
    const engine = createTestingEngine({ camera: "denied" });
    const tree = create(<CameraScreen engine={engine} />);

    // Wait for the initial check() to resolve.
    await act(async () => {});

    // After the check, the hook should have asked the engine.
    expect(engine.getRequestHistory()).toEqual([{ permission: "camera", method: "check" }]);

    // Flip the status — the next request() should return granted.
    engine.setStatus("camera", "granted");

    tree.unmount();
  });
});
```

## Driving a full flow

```tsx
import { render } from "@testing-library/react-native";
import { createTestingEngine } from "react-native-permission-handler/testing";
import { PermissionGate } from "react-native-permission-handler";

const engine = createTestingEngine({ camera: "denied" });

render(
  <PermissionGate
    engine={engine}
    permission="camera"
    prePrompt={{ title: "Camera", message: "…" }}
    blockedPrompt={{ title: "Blocked", message: "…" }}
  >
    <Text>Camera on</Text>
  </PermissionGate>,
);

// Simulate the user allowing access:
engine.setStatus("camera", "granted");

// Assert the request() history was called exactly once:
expect(engine.getRequestHistory().filter((e) => e.method === "request")).toHaveLength(1);
```

## API surface

```ts
interface TestingEngine extends PermissionEngine {
  setStatus(permission: string, status: PermissionStatus): void;
  getRequestHistory(): Array<{ permission: string; method: "check" | "request" }>;
  reset(): void;
}
```

- `setStatus` flips the stored status for a given permission key. Takes effect on the next
  `check()` or `request()`.
- `getRequestHistory` returns the full ordered history of calls — useful for "did we call request
  exactly once after the user tapped Allow?" style assertions.
- `reset` clears the history and restores the `initialStatuses` map.

## Per-permission defaults

```ts
const engine = createTestingEngine({
  camera: "granted",
  microphone: "denied",
  location: "blocked",
});
```

Anything not in `initialStatuses` defaults to `"denied"` for `check()` and `"granted"` for
`request()`, so you can start with an empty map and only seed the permissions you care about.

## Using `createNoopEngine` for Storybook and web

For Storybook stories and web builds, use `createNoopEngine` instead — it always returns
`"granted"` (or whatever you pass) without tracking history, so UI never blocks on the permission
flow.

```ts
import { createNoopEngine } from "react-native-permission-handler/noop";
setDefaultEngine(createNoopEngine("granted"));
```

## See also

- [Engines reference](../api/engines.md) for the full engine interface and resolution order.
- [`usePermissionHandler` reference](../api/use-permission-handler.md) for the hook under test.
