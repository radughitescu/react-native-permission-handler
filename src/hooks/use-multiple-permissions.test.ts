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
    autoCheck: false,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    engine = createMockEngine();
  });

  // --- Basic initialization ---

  it("initializes all permissions as idle when autoCheck is false", () => {
    const { result } = renderHook(() => useMultiplePermissions(baseConfig()));

    expect(result.current.allGranted).toBe(false);
    expect(Object.values(result.current.statuses)).toEqual(["idle", "idle"]);
  });

  it("auto-checks all permissions on mount", async () => {
    vi.mocked(engine.check).mockResolvedValueOnce("granted").mockResolvedValueOnce("denied");

    const { result } = renderHook(() => useMultiplePermissions(baseConfig({ autoCheck: true })));

    await act(async () => {});

    expect(engine.check).toHaveBeenCalledTimes(2);
    expect(result.current.statuses.camera).toBe("granted");
    expect(result.current.statuses.microphone).toBe("prePrompt");
  });

  it("exposes per-permission handlers", () => {
    const { result } = renderHook(() => useMultiplePermissions(baseConfig()));

    expect(result.current.handlers.camera).toBeDefined();
    expect(result.current.handlers.microphone).toBeDefined();
    expect(typeof result.current.handlers.camera.request).toBe("function");
    expect(typeof result.current.handlers.camera.dismiss).toBe("function");
    expect(typeof result.current.handlers.camera.dismissBlocked).toBe("function");
    expect(typeof result.current.handlers.camera.openSettings).toBe("function");
  });

  // --- Request flow ---

  it("request sets activePermission to first denied permission", async () => {
    vi.mocked(engine.check).mockResolvedValue("denied");

    const { result } = renderHook(() => useMultiplePermissions(baseConfig()));

    await act(async () => {
      await result.current.request();
    });

    expect(result.current.activePermission).toBe("camera");
    expect(result.current.statuses.camera).toBe("prePrompt");
  });

  it("grants all permissions when already granted", async () => {
    vi.mocked(engine.check).mockResolvedValue("granted");
    const onAllGranted = vi.fn();

    const { result } = renderHook(() => useMultiplePermissions(baseConfig({ onAllGranted })));

    await act(async () => {
      await result.current.request();
    });

    expect(result.current.allGranted).toBe(true);
    expect(result.current.activePermission).toBeNull();
    expect(onAllGranted).toHaveBeenCalledOnce();
  });

  // --- Sequential strategy ---

  it("sequential: confirm pre-prompt triggers request and advances", async () => {
    vi.mocked(engine.check).mockResolvedValue("denied");
    vi.mocked(engine.request).mockResolvedValue("granted");

    const { result } = renderHook(() => useMultiplePermissions(baseConfig()));

    await act(async () => {
      await result.current.request();
    });

    expect(result.current.activePermission).toBe("camera");

    // Confirm camera pre-prompt
    await act(async () => {
      await result.current.handlers.camera.request();
    });

    expect(result.current.statuses.camera).toBe("granted");
    expect(result.current.activePermission).toBe("microphone");

    // Confirm microphone pre-prompt
    await act(async () => {
      await result.current.handlers.microphone.request();
    });

    expect(result.current.statuses.microphone).toBe("granted");
    expect(result.current.activePermission).toBeNull();
  });

  it("sequential: dismiss stops the sequence", async () => {
    vi.mocked(engine.check).mockResolvedValue("denied");

    const { result } = renderHook(() => useMultiplePermissions(baseConfig()));

    await act(async () => {
      await result.current.request();
    });

    expect(result.current.activePermission).toBe("camera");

    act(() => {
      result.current.handlers.camera.dismiss();
    });

    expect(result.current.statuses.camera).toBe("denied");
    expect(result.current.activePermission).toBeNull();
  });

  it("sequential: stops on request denial", async () => {
    vi.mocked(engine.check).mockResolvedValue("denied");
    vi.mocked(engine.request).mockResolvedValue("denied");

    const { result } = renderHook(() => useMultiplePermissions(baseConfig()));

    await act(async () => {
      await result.current.request();
    });

    await act(async () => {
      await result.current.handlers.camera.request();
    });

    expect(result.current.statuses.camera).toBe("denied");
    expect(result.current.activePermission).toBeNull();
    // Microphone was never advanced to
    expect(engine.request).toHaveBeenCalledTimes(1);
  });

  // --- Blocked permissions ---

  it("tracks blockedPermissions", async () => {
    vi.mocked(engine.check).mockResolvedValueOnce("blocked").mockResolvedValueOnce("denied");

    const { result } = renderHook(() => useMultiplePermissions(baseConfig()));

    await act(async () => {
      await result.current.request();
    });

    expect(result.current.blockedPermissions).toContain("camera");
    expect(result.current.blockedPermissions).not.toContain("microphone");
  });

  it("per-permission dismissBlocked transitions to denied and advances", async () => {
    vi.mocked(engine.check).mockResolvedValue("blocked");

    const { result } = renderHook(() => useMultiplePermissions(baseConfig()));

    await act(async () => {
      await result.current.request();
    });

    expect(result.current.activePermission).toBe("camera");

    act(() => {
      result.current.handlers.camera.dismissBlocked();
    });

    expect(result.current.statuses.camera).toBe("denied");
    expect(result.current.activePermission).toBe("microphone");
  });

  it("per-permission openSettings sets state to openingSettings", async () => {
    vi.mocked(engine.check).mockResolvedValue("blocked");

    const { result } = renderHook(() => useMultiplePermissions(baseConfig()));

    await act(async () => {
      await result.current.request();
    });

    await act(async () => {
      await result.current.handlers.camera.openSettings();
    });

    expect(result.current.statuses.camera).toBe("openingSettings");
  });

  // --- Parallel strategy ---

  it("parallel: checks all then presents pre-prompts one at a time", async () => {
    vi.mocked(engine.check).mockResolvedValue("denied");

    const { result } = renderHook(() =>
      useMultiplePermissions(baseConfig({ strategy: "parallel" })),
    );

    await act(async () => {
      await result.current.request();
    });

    expect(result.current.activePermission).toBe("camera");
    expect(result.current.statuses.camera).toBe("prePrompt");
    expect(result.current.statuses.microphone).toBe("prePrompt");
  });

  it("parallel: skips already granted permissions", async () => {
    vi.mocked(engine.check).mockResolvedValueOnce("granted").mockResolvedValueOnce("denied");

    const { result } = renderHook(() =>
      useMultiplePermissions(baseConfig({ strategy: "parallel" })),
    );

    await act(async () => {
      await result.current.request();
    });

    expect(result.current.statuses.camera).toBe("granted");
    expect(result.current.activePermission).toBe("microphone");
  });

  // --- Callbacks ---

  it("fires per-permission callbacks on grant", async () => {
    vi.mocked(engine.check).mockResolvedValue("denied");
    vi.mocked(engine.request).mockResolvedValue("granted");
    const onGrant = vi.fn();

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
        },
      ],
    });

    const { result } = renderHook(() => useMultiplePermissions(config));

    await act(async () => {
      await result.current.request();
    });

    await act(async () => {
      await result.current.handlers.camera.request();
    });

    expect(onGrant).toHaveBeenCalledOnce();
  });

  it("fires onAllGranted when all complete via interactive flow", async () => {
    vi.mocked(engine.check).mockResolvedValue("denied");
    vi.mocked(engine.request).mockResolvedValue("granted");
    const onAllGranted = vi.fn();

    const { result } = renderHook(() => useMultiplePermissions(baseConfig({ onAllGranted })));

    await act(async () => {
      await result.current.request();
    });

    await act(async () => {
      await result.current.handlers.camera.request();
    });

    await act(async () => {
      await result.current.handlers.microphone.request();
    });

    expect(result.current.allGranted).toBe(true);
    expect(onAllGranted).toHaveBeenCalledOnce();
  });

  // --- Reset ---

  // --- Entry id keying (v0.7.0) ---

  it("keys statuses and handlers by entry.id when provided", async () => {
    vi.mocked(engine.check).mockResolvedValue("denied");

    const config: MultiplePermissionsConfig = {
      permissions: [
        {
          id: "camera",
          permission: "ios.permission.CAMERA",
          prePrompt: { title: "Camera", message: "Need camera" },
          blockedPrompt: { title: "Blocked", message: "Camera blocked" },
        },
      ],
      strategy: "sequential",
      engine,
      autoCheck: false,
    };

    const { result } = renderHook(() => useMultiplePermissions(config));

    expect(result.current.statuses.camera).toBeDefined();
    expect(result.current.handlers.camera).toBeDefined();
    expect(result.current.statuses["ios.permission.CAMERA"]).toBeUndefined();

    await act(async () => {
      await result.current.request();
    });

    expect(result.current.activePermission).toBe("camera");
    expect(result.current.statuses.camera).toBe("prePrompt");
  });

  it("falls back to permission string when entry.id is omitted", () => {
    const config: MultiplePermissionsConfig = {
      permissions: [
        {
          permission: "ios.permission.CAMERA",
          prePrompt: { title: "Camera", message: "Need camera" },
          blockedPrompt: { title: "Blocked", message: "Camera blocked" },
        },
      ],
      strategy: "sequential",
      engine,
      autoCheck: false,
    };

    const { result } = renderHook(() => useMultiplePermissions(config));

    expect(result.current.statuses["ios.permission.CAMERA"]).toBeDefined();
    expect(result.current.handlers["ios.permission.CAMERA"]).toBeDefined();
  });

  it("reset returns all permissions to idle", async () => {
    vi.mocked(engine.check).mockResolvedValue("denied");

    const { result } = renderHook(() => useMultiplePermissions(baseConfig()));

    await act(async () => {
      await result.current.request();
    });

    act(() => {
      result.current.reset();
    });

    expect(Object.values(result.current.statuses)).toEqual(["idle", "idle"]);
    expect(result.current.allGranted).toBe(false);
    expect(result.current.activePermission).toBeNull();
    expect(result.current.blockedPermissions).toEqual([]);
  });
});
