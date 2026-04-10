import { createElement } from "react";
import { type ReactTestRenderer, act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PermissionHandlerConfig, PermissionHandlerResult } from "../types";

// Mocks must be before imports that use them
vi.mock("react-native", () => ({
  AppState: {
    currentState: "active",
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  },
}));

vi.mock("react-native-permissions", () => ({
  check: vi.fn(),
  request: vi.fn(),
  openSettings: vi.fn(),
  checkNotifications: vi.fn(),
  requestNotifications: vi.fn(),
}));

import { check, checkNotifications, request, requestNotifications } from "react-native-permissions";
import { usePermissionHandler } from "./use-permission-handler";

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

const baseConfig: PermissionHandlerConfig = {
  permission: "ios.permission.CAMERA" as PermissionHandlerConfig["permission"],
  prePrompt: { title: "Camera", message: "We need camera access" },
  blockedPrompt: { title: "Blocked", message: "Camera is blocked" },
};

describe("usePermissionHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("auto-checks on mount and transitions to granted", async () => {
    vi.mocked(check).mockResolvedValue("granted");
    const { result } = renderHook(() => usePermissionHandler(baseConfig));

    // After mount, should be checking
    await act(async () => {});

    expect(result.current.isGranted).toBe(true);
    expect(result.current.state).toBe("granted");
    expect(check).toHaveBeenCalledWith(baseConfig.permission);
  });

  it("transitions to prePrompt when permission is denied", async () => {
    vi.mocked(check).mockResolvedValue("denied");
    const { result } = renderHook(() => usePermissionHandler(baseConfig));

    await act(async () => {});

    expect(result.current.state).toBe("prePrompt");
  });

  it("transitions to blockedPrompt when permission is blocked", async () => {
    vi.mocked(check).mockResolvedValue("blocked");
    const { result } = renderHook(() => usePermissionHandler(baseConfig));

    await act(async () => {});

    expect(result.current.state).toBe("blockedPrompt");
    expect(result.current.isBlocked).toBe(true);
  });

  it("transitions to unavailable", async () => {
    vi.mocked(check).mockResolvedValue("unavailable");
    const { result } = renderHook(() => usePermissionHandler(baseConfig));

    await act(async () => {});

    expect(result.current.isUnavailable).toBe(true);
    expect(result.current.state).toBe("unavailable");
  });

  it("skips auto-check when autoCheck is false", async () => {
    const { result } = renderHook(() => usePermissionHandler({ ...baseConfig, autoCheck: false }));

    await act(async () => {});

    expect(result.current.state).toBe("idle");
    expect(check).not.toHaveBeenCalled();
  });

  it("requests permission and fires onGrant", async () => {
    vi.mocked(check).mockResolvedValue("denied");
    vi.mocked(request).mockResolvedValue("granted");
    const onGrant = vi.fn();

    const { result } = renderHook(() => usePermissionHandler({ ...baseConfig, onGrant }));

    await act(async () => {});
    expect(result.current.state).toBe("prePrompt");

    await act(async () => {
      result.current.request();
    });

    expect(result.current.isGranted).toBe(true);
    expect(onGrant).toHaveBeenCalled();
  });

  it("fires onDeny when request is denied", async () => {
    vi.mocked(check).mockResolvedValue("denied");
    vi.mocked(request).mockResolvedValue("denied");
    const onDeny = vi.fn();

    const { result } = renderHook(() => usePermissionHandler({ ...baseConfig, onDeny }));

    await act(async () => {});
    await act(async () => {
      result.current.request();
    });

    expect(result.current.isDenied).toBe(true);
    expect(onDeny).toHaveBeenCalled();
  });

  it("fires onBlock when request results in blocked", async () => {
    vi.mocked(check).mockResolvedValue("denied");
    vi.mocked(request).mockResolvedValue("blocked");
    const onBlock = vi.fn();

    const { result } = renderHook(() => usePermissionHandler({ ...baseConfig, onBlock }));

    await act(async () => {});
    await act(async () => {
      result.current.request();
    });

    expect(result.current.state).toBe("blockedPrompt");
    expect(onBlock).toHaveBeenCalled();
  });

  it("uses notification API when permission is 'notifications'", async () => {
    vi.mocked(checkNotifications).mockResolvedValue({ status: "denied", settings: {} });
    vi.mocked(requestNotifications).mockResolvedValue({ status: "granted", settings: {} });

    const { result } = renderHook(() =>
      usePermissionHandler({ ...baseConfig, permission: "notifications" }),
    );

    await act(async () => {});
    expect(checkNotifications).toHaveBeenCalled();
    expect(check).not.toHaveBeenCalled();

    await act(async () => {
      result.current.request();
    });

    expect(requestNotifications).toHaveBeenCalledWith(["alert", "badge", "sound"]);
    expect(result.current.isGranted).toBe(true);
  });

  it("guards against double-tap race condition", async () => {
    vi.mocked(check).mockResolvedValue("denied");
    vi.mocked(request).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve("granted"), 50)),
    );

    const { result } = renderHook(() => usePermissionHandler(baseConfig));

    await act(async () => {});
    expect(result.current.state).toBe("prePrompt");

    await act(async () => {
      result.current.request();
      result.current.request(); // double-tap
    });

    expect(request).toHaveBeenCalledTimes(1);
  });

  it("dismiss fires onDeny and transitions to denied", async () => {
    vi.mocked(check).mockResolvedValue("denied");
    const onDeny = vi.fn();

    const { result } = renderHook(() => usePermissionHandler({ ...baseConfig, onDeny }));

    await act(async () => {});
    expect(result.current.state).toBe("prePrompt");

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.isDenied).toBe(true);
    expect(onDeny).toHaveBeenCalled();
  });
});
