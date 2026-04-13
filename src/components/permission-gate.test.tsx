import { type ReactNode, createElement } from "react";
import { type ReactTestRenderer, act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { PermissionEngine, PermissionHandlerResult } from "../types";

// Mock react-native primitives used by hooks + default prompts
vi.mock("react-native", () => ({
  AppState: {
    currentState: "active",
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  },
  Platform: {
    OS: "ios",
    select: (obj: { ios?: unknown; android?: unknown; default?: unknown }) =>
      obj.ios ?? obj.default,
  },
  View: ({ children }: { children?: ReactNode }) => children ?? null,
  Text: ({ children }: { children?: ReactNode }) => children ?? null,
  TouchableOpacity: ({ children }: { children?: ReactNode }) => children ?? null,
  Modal: ({ children, visible }: { children?: ReactNode; visible?: boolean }) =>
    visible ? children : null,
  Image: () => null,
  StyleSheet: { create: <T,>(s: T) => s, flatten: (s: unknown) => s },
}));

// Avoid accidental RNP fallback resolution
vi.mock("../engines/rnp-fallback", () => ({
  getRNPFallbackEngine: vi.fn(() => {
    throw new Error("No engine configured");
  }),
}));

import { PermissionGate } from "./permission-gate";

function mockEngine(initialStatus: "granted" | "limited" | "denied" | "blocked"): PermissionEngine {
  return {
    check: vi.fn().mockResolvedValue(initialStatus),
    request: vi.fn().mockResolvedValue(initialStatus),
    openSettings: vi.fn().mockResolvedValue(undefined),
  };
}

async function renderGate(element: ReactNode): Promise<ReactTestRenderer> {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(element as React.ReactElement);
  });
  // Flush autoCheck resolution
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });
  return tree;
}

describe("PermissionGate — renderLimited", () => {
  const prePrompt = { title: "P", message: "PM" };
  const blockedPrompt = { title: "B", message: "BM" };

  it("renders renderLimited when state is limited and renderLimited is provided", async () => {
    const engine = mockEngine("limited");
    let received: PermissionHandlerResult | null = null;
    const renderLimited = vi.fn((result: PermissionHandlerResult) => {
      received = result;
      return createElement("LimitedMarker", null, "limited-view");
    });

    const tree = await renderGate(
      createElement(
        PermissionGate,
        {
          engine,
          permission: "some.permission",
          prePrompt,
          blockedPrompt,
          renderLimited,
        },
        "granted-children",
      ),
    );

    expect(renderLimited).toHaveBeenCalled();
    expect(received).not.toBeNull();
    expect(received?.state).toBe("limited");
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("limited-view");
    expect(json).not.toContain("granted-children");
  });

  it("renders children (backward-compat) when limited and renderLimited is NOT provided", async () => {
    const engine = mockEngine("limited");

    const tree = await renderGate(
      createElement(
        PermissionGate,
        {
          engine,
          permission: "some.permission",
          prePrompt,
          blockedPrompt,
        },
        "granted-children",
      ),
    );

    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("granted-children");
  });
});
