import { createElement } from "react";
import { type ReactTestRenderer, act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  PermissionEngine,
  PermissionHandlerConfig,
  PermissionHandlerResult,
  PermissionStatus,
} from "../types";

// Mock react-native AppState + Platform
vi.mock("react-native", () => ({
  AppState: {
    currentState: "active",
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  },
  Platform: {
    OS: "ios",
  },
}));

// Mock the RNP fallback so hooks don't try to require react-native-permissions
vi.mock("../engines/rnp-fallback", () => ({
  getRNPFallbackEngine: vi.fn(() => {
    throw new Error("No engine configured");
  }),
}));

import { shouldSkipPrePrompt, usePermissionHandler } from "./use-permission-handler";

function createMockEngine(overrides?: Partial<PermissionEngine>): PermissionEngine {
  return {
    check: vi.fn().mockResolvedValue("granted"),
    request: vi.fn().mockResolvedValue("granted"),
    openSettings: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// Minimal renderHook using react-test-renderer
function renderHook(hookFn: () => PermissionHandlerResult) {
  const results: { current: PermissionHandlerResult } = {} as {
    current: PermissionHandlerResult;
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

describe("usePermissionHandler", () => {
  let engine: PermissionEngine;

  const baseConfig = (overrides?: Partial<PermissionHandlerConfig>): PermissionHandlerConfig => ({
    permission: "camera",
    engine,
    prePrompt: { title: "Camera", message: "We need camera access" },
    blockedPrompt: { title: "Blocked", message: "Camera is blocked" },
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    engine = createMockEngine();
  });

  it("auto-checks on mount and transitions to granted", async () => {
    vi.mocked(engine.check).mockResolvedValue("granted");
    const { result } = renderHook(() => usePermissionHandler(baseConfig()));

    await act(async () => {});

    expect(result.current.isGranted).toBe(true);
    expect(result.current.state).toBe("granted");
    expect(engine.check).toHaveBeenCalledWith("camera");
  });

  it("accepts config without prePrompt or blockedPrompt (custom-UI usage)", async () => {
    vi.mocked(engine.check).mockResolvedValue("denied");
    const { result } = renderHook(() =>
      usePermissionHandler({
        engine,
        permission: "camera",
        // no prePrompt, no blockedPrompt — must typecheck
      }),
    );

    await act(async () => {});

    expect(result.current.state).toBeDefined();
  });

  it("transitions to prePrompt when permission is denied", async () => {
    vi.mocked(engine.check).mockResolvedValue("denied");
    const { result } = renderHook(() => usePermissionHandler(baseConfig()));

    await act(async () => {});

    expect(result.current.state).toBe("prePrompt");
  });

  it("transitions to blockedPrompt when permission is blocked", async () => {
    vi.mocked(engine.check).mockResolvedValue("blocked");
    const { result } = renderHook(() => usePermissionHandler(baseConfig()));

    await act(async () => {});

    expect(result.current.state).toBe("blockedPrompt");
    expect(result.current.isBlocked).toBe(true);
  });

  it("transitions to unavailable", async () => {
    vi.mocked(engine.check).mockResolvedValue("unavailable");
    const { result } = renderHook(() => usePermissionHandler(baseConfig()));

    await act(async () => {});

    expect(result.current.isUnavailable).toBe(true);
    expect(result.current.state).toBe("unavailable");
  });

  it("skips auto-check when autoCheck is false", async () => {
    const { result } = renderHook(() => usePermissionHandler(baseConfig({ autoCheck: false })));

    await act(async () => {});

    expect(result.current.state).toBe("idle");
    expect(engine.check).not.toHaveBeenCalled();
  });

  it("requests permission and fires onGrant", async () => {
    vi.mocked(engine.check).mockResolvedValue("denied");
    vi.mocked(engine.request).mockResolvedValue("granted");
    const onGrant = vi.fn();

    const { result } = renderHook(() => usePermissionHandler(baseConfig({ onGrant })));

    await act(async () => {});
    expect(result.current.state).toBe("prePrompt");

    await act(async () => {
      result.current.request();
    });

    expect(result.current.isGranted).toBe(true);
    expect(onGrant).toHaveBeenCalled();
  });

  it("fires onDeny when request is denied", async () => {
    vi.mocked(engine.check).mockResolvedValue("denied");
    vi.mocked(engine.request).mockResolvedValue("denied");
    const onDeny = vi.fn();

    const { result } = renderHook(() => usePermissionHandler(baseConfig({ onDeny })));

    await act(async () => {});
    await act(async () => {
      result.current.request();
    });

    expect(result.current.isDenied).toBe(true);
    expect(onDeny).toHaveBeenCalled();
  });

  it("fires onBlock when request results in blocked", async () => {
    vi.mocked(engine.check).mockResolvedValue("denied");
    vi.mocked(engine.request).mockResolvedValue("blocked");
    const onBlock = vi.fn();

    const { result } = renderHook(() => usePermissionHandler(baseConfig({ onBlock })));

    await act(async () => {});
    await act(async () => {
      result.current.request();
    });

    expect(result.current.state).toBe("blockedPrompt");
    expect(onBlock).toHaveBeenCalled();
  });

  it("passes permission string to engine (notification routing is engine's job)", async () => {
    vi.mocked(engine.check).mockResolvedValue("denied");
    vi.mocked(engine.request).mockResolvedValue("granted");

    const { result } = renderHook(() =>
      usePermissionHandler(baseConfig({ permission: "notifications" })),
    );

    await act(async () => {});
    expect(engine.check).toHaveBeenCalledWith("notifications");

    await act(async () => {
      result.current.request();
    });

    expect(engine.request).toHaveBeenCalledWith("notifications");
    expect(result.current.isGranted).toBe(true);
  });

  it("guards against double-tap race condition", async () => {
    vi.mocked(engine.check).mockResolvedValue("denied");
    vi.mocked(engine.request).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve("granted"), 50)),
    );

    const { result } = renderHook(() => usePermissionHandler(baseConfig()));

    await act(async () => {});
    expect(result.current.state).toBe("prePrompt");

    await act(async () => {
      result.current.request();
      result.current.request(); // double-tap
    });

    expect(engine.request).toHaveBeenCalledTimes(1);
  });

  it("dismissBlocked fires onDeny and transitions to denied", async () => {
    vi.mocked(engine.check).mockResolvedValue("blocked");
    const onDeny = vi.fn();

    const { result } = renderHook(() => usePermissionHandler(baseConfig({ onDeny })));

    await act(async () => {});
    expect(result.current.state).toBe("blockedPrompt");

    act(() => {
      result.current.dismissBlocked();
    });

    expect(result.current.isDenied).toBe(true);
    expect(onDeny).toHaveBeenCalled();
  });

  it("reset returns to idle and clears nativeStatus", async () => {
    vi.mocked(engine.check).mockResolvedValue("granted");

    const { result } = renderHook(() => usePermissionHandler(baseConfig()));

    await act(async () => {});
    expect(result.current.isGranted).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toBe("idle");
    expect(result.current.nativeStatus).toBeNull();
  });

  it("skipPrePrompt=true bypasses prePrompt and calls engine.request directly", async () => {
    vi.mocked(engine.check).mockResolvedValue("denied");
    vi.mocked(engine.request).mockResolvedValue("granted");
    const onGrant = vi.fn();

    const { result } = renderHook(() =>
      usePermissionHandler(baseConfig({ skipPrePrompt: true, onGrant })),
    );

    await act(async () => {});

    // After autoCheck, we should have bypassed prePrompt entirely and reached granted.
    expect(engine.request).toHaveBeenCalledWith("camera");
    expect(result.current.state).toBe("granted");
    expect(result.current.isGranted).toBe(true);
    expect(onGrant).toHaveBeenCalled();
  });

  it("skipPrePrompt=false (default) still goes through prePrompt on denied", async () => {
    vi.mocked(engine.check).mockResolvedValue("denied");
    vi.mocked(engine.request).mockResolvedValue("granted");

    const { result } = renderHook(() => usePermissionHandler(baseConfig({ skipPrePrompt: false })));

    await act(async () => {});

    expect(result.current.state).toBe("prePrompt");
    expect(engine.request).not.toHaveBeenCalled();
  });

  it("requestFullAccess calls engine.requestFullAccess and re-checks state", async () => {
    const mockRequestFullAccess = vi.fn().mockResolvedValue("granted");
    const checkMock = vi
      .fn<[string], Promise<PermissionStatus>>()
      .mockResolvedValueOnce("limited")
      .mockResolvedValue("granted");
    engine = {
      check: checkMock,
      request: vi.fn().mockResolvedValue("granted"),
      openSettings: vi.fn().mockResolvedValue(undefined),
      requestFullAccess: mockRequestFullAccess,
    };

    const { result } = renderHook(() =>
      usePermissionHandler(baseConfig({ permission: "photoLibrary" })),
    );

    await act(async () => {});
    expect(result.current.state).toBe("limited");
    expect(result.current.isLimited).toBe(true);

    await act(async () => {
      await result.current.requestFullAccess();
    });

    expect(mockRequestFullAccess).toHaveBeenCalledWith("photoLibrary");
    expect(result.current.state).toBe("granted");
  });

  it("requestFullAccess throws when engine does not implement it", async () => {
    engine = {
      check: vi.fn().mockResolvedValue("limited"),
      request: vi.fn().mockResolvedValue("granted"),
      openSettings: vi.fn().mockResolvedValue(undefined),
      // no requestFullAccess
    };

    const { result } = renderHook(() =>
      usePermissionHandler(baseConfig({ permission: "photoLibrary" })),
    );

    await act(async () => {});
    expect(result.current.state).toBe("limited");

    await expect(result.current.requestFullAccess()).rejects.toThrow(/requestFullAccess/);
  });

  it("dismiss fires onDeny and transitions to denied", async () => {
    vi.mocked(engine.check).mockResolvedValue("denied");
    const onDeny = vi.fn();

    const { result } = renderHook(() => usePermissionHandler(baseConfig({ onDeny })));

    await act(async () => {});
    expect(result.current.state).toBe("prePrompt");

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.isDenied).toBe(true);
    expect(onDeny).toHaveBeenCalled();
  });
});

describe("Android 16 hang recovery (integration)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock("react-native", () => ({
      AppState: {
        currentState: "active",
        addEventListener: vi.fn(() => ({ remove: vi.fn() })),
      },
      Platform: {
        OS: "android",
        Version: 36,
      },
    }));
    vi.doMock("../engines/rnp-fallback", () => ({
      getRNPFallbackEngine: vi.fn(() => {
        throw new Error("No engine configured");
      }),
    }));
  });

  it("auto-recovers to blockedPrompt when engine.request() hangs on Android 16+", async () => {
    vi.useFakeTimers();
    try {
      const { usePermissionHandler: usePermissionHandlerAndroid } = await import(
        "./use-permission-handler"
      );

      const hangingEngine: PermissionEngine = {
        check: vi.fn().mockResolvedValue("denied"),
        // Promise that never resolves — simulates the Android 16 request hang
        request: vi.fn(() => new Promise<PermissionStatus>(() => {})),
        openSettings: vi.fn().mockResolvedValue(undefined),
      };
      const onTimeout = vi.fn();
      const onBlock = vi.fn();

      const results: { current: PermissionHandlerResult } = {} as {
        current: PermissionHandlerResult;
      };
      function TestComponent() {
        results.current = usePermissionHandlerAndroid({
          permission: "camera",
          engine: hangingEngine,
          prePrompt: { title: "Camera", message: "We need camera access" },
          blockedPrompt: { title: "Blocked", message: "Camera is blocked" },
          onTimeout,
          onBlock,
          // NOTE: no requestTimeout — relying on the Android 16+ default
        });
        return null;
      }

      let renderer: ReactTestRenderer;
      await act(async () => {
        renderer = create(createElement(TestComponent));
      });
      // Flush auto-check microtasks
      await act(async () => {
        await Promise.resolve();
      });
      expect(results.current.state).toBe("prePrompt");

      // Fire the request — it will hang forever without the timeout
      act(() => {
        void results.current.request();
      });
      expect(results.current.state).toBe("requesting");
      expect(hangingEngine.request).toHaveBeenCalledWith("camera");

      // Advance fake timers past the 5000ms Android 16+ default timeout
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5500);
      });

      expect(onTimeout).toHaveBeenCalledTimes(1);
      expect(results.current.state).toBe("blockedPrompt");
      expect(results.current.isBlocked).toBe(true);

      // biome-ignore lint/style/noNonNullAssertion: renderer is assigned in act()
      act(() => renderer!.unmount());
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("shouldSkipPrePrompt", () => {
  it("returns true when value is true on ios", () => {
    expect(shouldSkipPrePrompt(true, "ios")).toBe(true);
  });

  it("returns true when value is true on android", () => {
    expect(shouldSkipPrePrompt(true, "android")).toBe(true);
  });

  it("returns false when value is 'android' on ios", () => {
    expect(shouldSkipPrePrompt("android", "ios")).toBe(false);
  });

  it("returns true when value is 'android' on android", () => {
    expect(shouldSkipPrePrompt("android", "android")).toBe(true);
  });

  it("returns false when value is false on ios", () => {
    expect(shouldSkipPrePrompt(false, "ios")).toBe(false);
  });

  it("returns false when value is false on android", () => {
    expect(shouldSkipPrePrompt(false, "android")).toBe(false);
  });

  it("returns false when value is undefined (default)", () => {
    expect(shouldSkipPrePrompt(undefined, "ios")).toBe(false);
    expect(shouldSkipPrePrompt(undefined, "android")).toBe(false);
  });
});
