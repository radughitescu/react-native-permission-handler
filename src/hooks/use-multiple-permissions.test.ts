import { createElement } from "react";
import { type ReactTestRenderer, act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  MultiplePermissionsConfig,
  MultiplePermissionsResult,
  PermissionEngine,
} from "../types";

vi.mock("react-native", () => ({
  AppState: {
    currentState: "active",
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  },
}));

// Mock the RNP fallback so hooks don't try to require react-native-permissions
vi.mock("../engines/rnp-fallback", () => ({
  getRNPFallbackEngine: vi.fn(() => {
    throw new Error("No engine configured");
  }),
}));

import { useMultiplePermissions } from "./use-multiple-permissions";

function createMockEngine(overrides?: Partial<PermissionEngine>): PermissionEngine {
  return {
    check: vi.fn().mockResolvedValue("granted"),
    request: vi.fn().mockResolvedValue("granted"),
    openSettings: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function renderHook(hookFn: () => MultiplePermissionsResult) {
  const results: { current: MultiplePermissionsResult } = {} as {
    current: MultiplePermissionsResult;
  };
  function TestComponent() {
    results.current = hookFn();
    return null;
  }
  let renderer: ReactTestRenderer;
  act(() => {
    renderer = create(createElement(TestComponent));
  });
  return {
    result: results,
    unmount: () => act(() => renderer.unmount()),
  };
}

describe("useMultiplePermissions", () => {
  let engine: PermissionEngine;

  const baseConfig = (
    overrides?: Partial<MultiplePermissionsConfig>,
  ): MultiplePermissionsConfig => ({
    permissions: [
      {
        permission: "camera",
        prePrompt: { title: "Camera", message: "Need camera" },
        blockedPrompt: { title: "Blocked", message: "Camera blocked" },
      },
      {
        permission: "microphone",
        prePrompt: { title: "Mic", message: "Need mic" },
        blockedPrompt: { title: "Blocked", message: "Mic blocked" },
      },
    ],
    strategy: "sequential",
    engine,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    engine = createMockEngine();
  });

  it("initializes all permissions as idle when autoCheck is false", () => {
    const { result } = renderHook(() => useMultiplePermissions(baseConfig({ autoCheck: false })));

    expect(result.current.allGranted).toBe(false);
    expect(Object.values(result.current.statuses)).toEqual(["idle", "idle"]);
  });

  it("auto-checks all permissions on mount", async () => {
    vi.mocked(engine.check).mockResolvedValueOnce("granted").mockResolvedValueOnce("denied");

    const { result } = renderHook(() => useMultiplePermissions(baseConfig()));

    await act(async () => {});

    expect(engine.check).toHaveBeenCalledTimes(2);
    expect(result.current.statuses.camera).toBe("granted");
    expect(result.current.statuses.microphone).toBe("prePrompt");
  });

  it("grants all permissions sequentially when already granted", async () => {
    vi.mocked(engine.check).mockResolvedValue("granted");
    const onAllGranted = vi.fn();

    const { result } = renderHook(() => useMultiplePermissions(baseConfig({ onAllGranted })));

    await act(async () => {
      await result.current.request();
    });

    expect(result.current.allGranted).toBe(true);
    expect(onAllGranted).toHaveBeenCalledOnce();
  });

  it("requests denied permissions sequentially", async () => {
    // Auto-check on mount returns denied for both, then requestAll flow
    // checks again (denied), requests (granted), and final re-checks (granted)
    vi.mocked(engine.check)
      .mockResolvedValueOnce("denied") // auto-check: camera
      .mockResolvedValueOnce("denied") // auto-check: mic
      .mockResolvedValueOnce("denied") // requestAll: camera check
      .mockResolvedValueOnce("denied") // requestAll: mic check
      .mockResolvedValue("granted"); // final re-checks
    vi.mocked(engine.request).mockResolvedValue("granted");
    const onAllGranted = vi.fn();

    const { result } = renderHook(() => useMultiplePermissions(baseConfig({ onAllGranted })));

    await act(async () => {});
    await act(async () => {
      await result.current.request();
    });

    expect(result.current.allGranted).toBe(true);
    expect(engine.request).toHaveBeenCalledTimes(2);
    expect(onAllGranted).toHaveBeenCalledOnce();
  });

  it("stops sequential flow when permission is denied", async () => {
    vi.mocked(engine.check).mockResolvedValue("denied");
    vi.mocked(engine.request).mockResolvedValueOnce("denied");

    const { result } = renderHook(() => useMultiplePermissions(baseConfig()));

    await act(async () => {
      await result.current.request();
    });

    expect(result.current.allGranted).toBe(false);
    expect(engine.request).toHaveBeenCalledTimes(1);
  });

  it("fires per-permission callbacks", async () => {
    vi.mocked(engine.check).mockResolvedValue("denied");
    vi.mocked(engine.request).mockResolvedValueOnce("granted").mockResolvedValueOnce("denied");
    const onGrant = vi.fn();
    const onDeny = vi.fn();

    const config = baseConfig({
      permissions: [
        {
          permission: "camera",
          prePrompt: { title: "Camera", message: "Need camera" },
          blockedPrompt: { title: "Blocked", message: "Camera blocked" },
          onGrant,
        },
        {
          permission: "microphone",
          prePrompt: { title: "Mic", message: "Need mic" },
          blockedPrompt: { title: "Blocked", message: "Mic blocked" },
          onDeny,
        },
      ],
    });

    const { result } = renderHook(() => useMultiplePermissions(config));

    await act(async () => {
      await result.current.request();
    });

    expect(onGrant).toHaveBeenCalledOnce();
    expect(onDeny).toHaveBeenCalledOnce();
  });

  it("reset returns all permissions to idle", async () => {
    vi.mocked(engine.check).mockResolvedValue("granted");

    const { result } = renderHook(() => useMultiplePermissions(baseConfig()));

    await act(async () => {});
    expect(result.current.allGranted).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(Object.values(result.current.statuses)).toEqual(["idle", "idle"]);
    expect(result.current.allGranted).toBe(false);
  });

  it("handles parallel strategy — checks all, then requests denied", async () => {
    vi.mocked(engine.check)
      .mockResolvedValueOnce("granted") // camera already granted
      .mockResolvedValueOnce("denied") // mic needs request
      .mockResolvedValue("granted"); // final re-checks
    vi.mocked(engine.request).mockResolvedValue("granted");
    const onAllGranted = vi.fn();

    const config = baseConfig({
      strategy: "parallel",
      onAllGranted,
    });

    const { result } = renderHook(() => useMultiplePermissions(config));

    await act(async () => {
      await result.current.request();
    });

    expect(engine.request).toHaveBeenCalledTimes(1); // only mic was requested
    expect(onAllGranted).toHaveBeenCalledOnce();
  });
});
