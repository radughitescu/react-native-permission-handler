import { createElement } from "react";
import { type ReactTestRenderer, act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MultiplePermissionsConfig, MultiplePermissionsResult } from "../types";

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

import { check, request } from "react-native-permissions";
import { useMultiplePermissions } from "./use-multiple-permissions";

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

const baseConfig: MultiplePermissionsConfig = {
  permissions: [
    {
      permission:
        "ios.permission.CAMERA" as MultiplePermissionsConfig["permissions"][0]["permission"],
      prePrompt: { title: "Camera", message: "Need camera" },
      blockedPrompt: { title: "Blocked", message: "Camera blocked" },
    },
    {
      permission:
        "ios.permission.MICROPHONE" as MultiplePermissionsConfig["permissions"][0]["permission"],
      prePrompt: { title: "Mic", message: "Need mic" },
      blockedPrompt: { title: "Blocked", message: "Mic blocked" },
    },
  ],
  strategy: "sequential",
};

describe("useMultiplePermissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes all permissions as idle", () => {
    const { result } = renderHook(() => useMultiplePermissions(baseConfig));

    expect(result.current.allGranted).toBe(false);
    expect(Object.values(result.current.statuses)).toEqual(["idle", "idle"]);
  });

  it("grants all permissions sequentially when already granted", async () => {
    vi.mocked(check).mockResolvedValue("granted");
    const onAllGranted = vi.fn();

    const { result } = renderHook(() => useMultiplePermissions({ ...baseConfig, onAllGranted }));

    await act(async () => {
      await result.current.request();
    });

    expect(result.current.allGranted).toBe(true);
    expect(onAllGranted).toHaveBeenCalledOnce();
  });

  it("requests denied permissions sequentially", async () => {
    // Initial checks return denied, final re-checks return granted
    vi.mocked(check)
      .mockResolvedValueOnce("denied") // camera initial check
      .mockResolvedValueOnce("denied") // mic initial check
      .mockResolvedValue("granted"); // final re-checks
    vi.mocked(request).mockResolvedValue("granted");
    const onAllGranted = vi.fn();

    const { result } = renderHook(() => useMultiplePermissions({ ...baseConfig, onAllGranted }));

    await act(async () => {
      await result.current.request();
    });

    expect(result.current.allGranted).toBe(true);
    expect(request).toHaveBeenCalledTimes(2);
    expect(onAllGranted).toHaveBeenCalledOnce();
  });

  it("stops sequential flow when permission is denied", async () => {
    vi.mocked(check).mockResolvedValue("denied");
    vi.mocked(request).mockResolvedValueOnce("denied");

    const { result } = renderHook(() => useMultiplePermissions(baseConfig));

    await act(async () => {
      await result.current.request();
    });

    expect(result.current.allGranted).toBe(false);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("fires per-permission callbacks", async () => {
    vi.mocked(check).mockResolvedValue("denied");
    vi.mocked(request).mockResolvedValueOnce("granted").mockResolvedValueOnce("denied");
    const onGrant = vi.fn();
    const onDeny = vi.fn();

    const config: MultiplePermissionsConfig = {
      ...baseConfig,
      permissions: [
        { ...baseConfig.permissions[0], onGrant },
        { ...baseConfig.permissions[1], onDeny },
      ],
    };

    const { result } = renderHook(() => useMultiplePermissions(config));

    await act(async () => {
      await result.current.request();
    });

    expect(onGrant).toHaveBeenCalledOnce();
    expect(onDeny).toHaveBeenCalledOnce();
  });

  it("handles parallel strategy — checks all, then requests denied", async () => {
    vi.mocked(check)
      .mockResolvedValueOnce("granted") // camera already granted
      .mockResolvedValueOnce("denied") // mic needs request
      .mockResolvedValue("granted"); // final re-checks
    vi.mocked(request).mockResolvedValue("granted");
    const onAllGranted = vi.fn();

    const config: MultiplePermissionsConfig = {
      ...baseConfig,
      strategy: "parallel",
      onAllGranted,
    };

    const { result } = renderHook(() => useMultiplePermissions(config));

    await act(async () => {
      await result.current.request();
    });

    expect(request).toHaveBeenCalledTimes(1); // only mic was requested
    expect(onAllGranted).toHaveBeenCalledOnce();
  });
});
