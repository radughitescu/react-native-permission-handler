import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({
  Platform: {
    OS: "ios",
    Version: 33,
    select: (opts: Record<string, string>) => opts.ios ?? opts.default,
  },
}));

vi.mock("react-native-permissions", () => ({
  check: vi.fn(),
  request: vi.fn(),
  openSettings: vi.fn(),
  checkNotifications: vi.fn(),
  requestNotifications: vi.fn(),
  PERMISSIONS: {
    IOS: {
      BLUETOOTH: "ios.permission.BLUETOOTH",
      CALENDARS: "ios.permission.CALENDARS",
      CALENDARS_WRITE_ONLY: "ios.permission.CALENDARS_WRITE_ONLY",
    },
    ANDROID: {
      ACCESS_FINE_LOCATION: "android.permission.ACCESS_FINE_LOCATION",
      BLUETOOTH_SCAN: "android.permission.BLUETOOTH_SCAN",
      BLUETOOTH_CONNECT: "android.permission.BLUETOOTH_CONNECT",
      WRITE_CALENDAR: "android.permission.WRITE_CALENDAR",
    },
  },
}));

import {
  check,
  checkNotifications,
  openSettings,
  request,
  requestNotifications,
} from "react-native-permissions";
import { Permissions, createRNPEngine } from "./rnp";

describe("createRNPEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("check", () => {
    it("delegates to check() for regular permissions", async () => {
      vi.mocked(check).mockResolvedValue("granted");
      const engine = createRNPEngine();

      const result = await engine.check("ios.permission.CAMERA");

      expect(check).toHaveBeenCalledWith("ios.permission.CAMERA");
      expect(result).toBe("granted");
    });

    it("delegates to checkNotifications() for 'notifications'", async () => {
      vi.mocked(checkNotifications).mockResolvedValue({
        status: "denied",
        settings: {},
      });
      const engine = createRNPEngine();

      const result = await engine.check("notifications");

      expect(checkNotifications).toHaveBeenCalled();
      expect(check).not.toHaveBeenCalled();
      expect(result).toBe("denied");
    });

    it("returns all status values correctly", async () => {
      const engine = createRNPEngine();

      for (const status of ["granted", "denied", "blocked", "limited", "unavailable"] as const) {
        vi.mocked(check).mockResolvedValue(status);
        expect(await engine.check("some.permission")).toBe(status);
      }
    });
  });

  describe("request", () => {
    it("delegates to request() for regular permissions", async () => {
      vi.mocked(request).mockResolvedValue("granted");
      const engine = createRNPEngine();

      const result = await engine.request("ios.permission.CAMERA");

      expect(request).toHaveBeenCalledWith("ios.permission.CAMERA");
      expect(result).toBe("granted");
    });

    it("delegates to requestNotifications() for 'notifications'", async () => {
      vi.mocked(requestNotifications).mockResolvedValue({
        status: "granted",
        settings: {},
      });
      const engine = createRNPEngine();

      const result = await engine.request("notifications");

      expect(requestNotifications).toHaveBeenCalledWith(["alert", "badge", "sound"]);
      expect(request).not.toHaveBeenCalled();
      expect(result).toBe("granted");
    });
  });

  describe("openSettings", () => {
    it("delegates to openSettings()", async () => {
      vi.mocked(openSettings).mockResolvedValue(undefined as never);
      const engine = createRNPEngine();

      await engine.openSettings();

      expect(openSettings).toHaveBeenCalled();
    });
  });
});

describe("createRNPEngine — photo library normalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps unavailable → blocked for PHOTO_LIBRARY when normalizePhotoLibrary is true", async () => {
    vi.mocked(check).mockResolvedValue("unavailable");
    vi.mocked(request).mockResolvedValue("unavailable");
    const engine = createRNPEngine({ normalizePhotoLibrary: true });

    expect(await engine.check(Permissions.PHOTO_LIBRARY)).toBe("blocked");
    expect(await engine.request(Permissions.PHOTO_LIBRARY)).toBe("blocked");
  });

  it("maps unavailable → blocked for PHOTO_LIBRARY_ADD_ONLY when normalizePhotoLibrary is true", async () => {
    vi.mocked(check).mockResolvedValue("unavailable");
    const engine = createRNPEngine({ normalizePhotoLibrary: true });

    expect(await engine.check(Permissions.PHOTO_LIBRARY_ADD_ONLY)).toBe("blocked");
  });

  it("leaves unavailable unchanged for non-photo permissions with the flag on", async () => {
    vi.mocked(check).mockResolvedValue("unavailable");
    vi.mocked(request).mockResolvedValue("unavailable");
    const engine = createRNPEngine({ normalizePhotoLibrary: true });

    expect(await engine.check(Permissions.CAMERA)).toBe("unavailable");
    expect(await engine.request(Permissions.CAMERA)).toBe("unavailable");
  });

  it("leaves unavailable unchanged when flag is false or omitted", async () => {
    vi.mocked(check).mockResolvedValue("unavailable");
    const engineDefault = createRNPEngine();
    const engineFalse = createRNPEngine({ normalizePhotoLibrary: false });

    expect(await engineDefault.check(Permissions.PHOTO_LIBRARY)).toBe("unavailable");
    expect(await engineFalse.check(Permissions.PHOTO_LIBRARY)).toBe("unavailable");
  });

  it("does not affect non-unavailable statuses for photo permissions", async () => {
    const engine = createRNPEngine({ normalizePhotoLibrary: true });

    for (const status of ["granted", "denied", "blocked", "limited"] as const) {
      vi.mocked(check).mockResolvedValue(status);
      expect(await engine.check(Permissions.PHOTO_LIBRARY)).toBe(status);
    }
  });
});

describe("Permissions constants", () => {
  it("resolves cross-platform permissions to iOS strings (mocked platform)", () => {
    expect(Permissions.CAMERA).toBe("ios.permission.CAMERA");
    expect(Permissions.MICROPHONE).toBe("ios.permission.MICROPHONE");
    expect(Permissions.LOCATION_WHEN_IN_USE).toBe("ios.permission.LOCATION_WHEN_IN_USE");
    expect(Permissions.MEDIA_LIBRARY).toBe("ios.permission.MEDIA_LIBRARY");
    expect(Permissions.SPEECH_RECOGNITION).toBe("ios.permission.SPEECH_RECOGNITION");
    expect(Permissions.MOTION).toBe("ios.permission.MOTION");
    expect(Permissions.NOTIFICATIONS).toBe("notifications");
  });

  it("includes all cross-platform permissions", () => {
    const keys = Object.keys(Permissions);
    for (const key of [
      "CAMERA",
      "MICROPHONE",
      "CONTACTS",
      "CALENDARS",
      "CALENDARS_WRITE_ONLY",
      "LOCATION_WHEN_IN_USE",
      "LOCATION_ALWAYS",
      "PHOTO_LIBRARY",
      "PHOTO_LIBRARY_ADD_ONLY",
      "MEDIA_LIBRARY",
      "VIDEO_LIBRARY",
      "BLUETOOTH",
      "SPEECH_RECOGNITION",
      "MOTION",
      "NOTIFICATIONS",
    ]) {
      expect(keys).toContain(key);
    }
  });

  it("includes iOS-only permissions", () => {
    expect(Permissions.IOS.FACE_ID).toBe("ios.permission.FACE_ID");
    expect(Permissions.IOS.APP_TRACKING_TRANSPARENCY).toBe(
      "ios.permission.APP_TRACKING_TRANSPARENCY",
    );
    expect(Permissions.IOS.SIRI).toBe("ios.permission.SIRI");
    expect(Permissions.IOS.REMINDERS).toBe("ios.permission.REMINDERS");
    expect(Permissions.IOS.STOREKIT).toBe("ios.permission.STOREKIT");
  });

  it("includes Android-only permissions", () => {
    expect(Permissions.ANDROID.BODY_SENSORS).toBe("android.permission.BODY_SENSORS");
    expect(Permissions.ANDROID.CALL_PHONE).toBe("android.permission.CALL_PHONE");
    expect(Permissions.ANDROID.READ_SMS).toBe("android.permission.READ_SMS");
    expect(Permissions.ANDROID.BLUETOOTH_SCAN).toBe("android.permission.BLUETOOTH_SCAN");
    expect(Permissions.ANDROID.READ_MEDIA_VIDEO).toBe("android.permission.READ_MEDIA_VIDEO");
  });
});

describe("createRNPEngine — Android normalization (opt-in)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  async function loadWithPlatform(os: "ios" | "android", version: number) {
    vi.doMock("react-native", () => ({
      Platform: {
        OS: os,
        Version: version,
        select: (opts: Record<string, string>) => opts[os] ?? opts.default,
      },
    }));
    const rnpMock = {
      check: vi.fn(),
      request: vi.fn(),
      openSettings: vi.fn(),
      checkNotifications: vi.fn(),
      requestNotifications: vi.fn(),
      PERMISSIONS: {
        IOS: {
          BLUETOOTH: "ios.permission.BLUETOOTH",
          CALENDARS: "ios.permission.CALENDARS",
          CALENDARS_WRITE_ONLY: "ios.permission.CALENDARS_WRITE_ONLY",
        },
        ANDROID: {
          ACCESS_FINE_LOCATION: "android.permission.ACCESS_FINE_LOCATION",
          BLUETOOTH_SCAN: "android.permission.BLUETOOTH_SCAN",
          BLUETOOTH_CONNECT: "android.permission.BLUETOOTH_CONNECT",
          WRITE_CALENDAR: "android.permission.WRITE_CALENDAR",
        },
      },
    };
    vi.doMock("react-native-permissions", () => rnpMock);
    const { createRNPEngine: create } = await import("./rnp");
    return { createRNPEngine: create, rnp: rnpMock };
  }

  it("rewrites POST_NOTIFICATIONS denied → granted on Android API 30 with flag on", async () => {
    const { createRNPEngine: create, rnp } = await loadWithPlatform("android", 30);
    rnp.check.mockResolvedValue("denied");
    const engine = create({ normalizeAndroid: true });

    const result = await engine.check("android.permission.POST_NOTIFICATIONS");

    expect(result).toBe("granted");
  });

  it("leaves POST_NOTIFICATIONS denied unchanged on Android API 33 with flag on", async () => {
    const { createRNPEngine: create, rnp } = await loadWithPlatform("android", 33);
    rnp.check.mockResolvedValue("denied");
    const engine = create({ normalizeAndroid: true });

    const result = await engine.check("android.permission.POST_NOTIFICATIONS");

    expect(result).toBe("denied");
  });

  it("rewrites blocked → denied on first request() call with flag on", async () => {
    const { createRNPEngine: create, rnp } = await loadWithPlatform("android", 34);
    rnp.request.mockResolvedValue("blocked");
    const engine = create({ normalizeAndroid: true });

    const result = await engine.request("android.permission.CAMERA");

    expect(result).toBe("denied");
  });

  it("returns blocked on second request() call when RNP returns blocked twice", async () => {
    const { createRNPEngine: create, rnp } = await loadWithPlatform("android", 34);
    rnp.request.mockResolvedValue("blocked");
    const engine = create({ normalizeAndroid: true });

    const first = await engine.request("android.permission.CAMERA");
    const second = await engine.request("android.permission.CAMERA");

    expect(first).toBe("denied");
    expect(second).toBe("blocked");
  });

  it("tracks request counts per-permission independently", async () => {
    const { createRNPEngine: create, rnp } = await loadWithPlatform("android", 34);
    rnp.request.mockResolvedValue("blocked");
    const engine = create({ normalizeAndroid: true });

    // Two calls on CAMERA — second becomes blocked
    await engine.request("android.permission.CAMERA");
    const cameraSecond = await engine.request("android.permission.CAMERA");
    // First call on MICROPHONE — should still be denied
    const micFirst = await engine.request("android.permission.RECORD_AUDIO");

    expect(cameraSecond).toBe("blocked");
    expect(micFirst).toBe("denied");
  });

  it("does not apply Android normalization when flag is omitted (regression)", async () => {
    const { createRNPEngine: create, rnp } = await loadWithPlatform("android", 30);
    rnp.check.mockResolvedValue("denied");
    rnp.request.mockResolvedValue("blocked");
    const engine = create();

    expect(await engine.check("android.permission.POST_NOTIFICATIONS")).toBe("denied");
    expect(await engine.request("android.permission.CAMERA")).toBe("blocked");
  });

  it("does not apply Android normalization when flag is false", async () => {
    const { createRNPEngine: create, rnp } = await loadWithPlatform("android", 30);
    rnp.check.mockResolvedValue("denied");
    const engine = create({ normalizeAndroid: false });

    expect(await engine.check("android.permission.POST_NOTIFICATIONS")).toBe("denied");
  });

  it("is a no-op on iOS even with flag on", async () => {
    const { createRNPEngine: create, rnp } = await loadWithPlatform("ios", 17);
    rnp.check.mockResolvedValue("blocked");
    rnp.request.mockResolvedValue("blocked");
    const engine = create({ normalizeAndroid: true });

    expect(await engine.check("ios.permission.CAMERA")).toBe("blocked");
    expect(await engine.request("ios.permission.CAMERA")).toBe("blocked");
  });

  it("combines with normalizePhotoLibrary flag (both normalizations apply)", async () => {
    const { createRNPEngine: create, rnp } = await loadWithPlatform("android", 30);
    // Photo lib resolves to READ_EXTERNAL_STORAGE on pre-33 Android.
    rnp.check.mockResolvedValue("unavailable");
    const engine = create({ normalizePhotoLibrary: true, normalizeAndroid: true });

    // unavailable → blocked (photo lib), then blocked → denied (dialog dismiss, requestCount=0)
    const result = await engine.check("android.permission.READ_EXTERNAL_STORAGE");
    expect(result).toBe("denied");
  });

  it("check() returns blocked for POST_NOTIFICATIONS after cached request blocked", async () => {
    const { createRNPEngine: create, rnp } = await loadWithPlatform("android", 33);
    // Two requests both return blocked. First is rewritten to denied (dialog dismiss),
    // second passes through as blocked and is cached. Then check() returns denied raw,
    // which the new heuristic rewrites to blocked using the cache.
    rnp.request.mockResolvedValue("blocked");
    rnp.check.mockResolvedValue("denied");
    const engine = create({ normalizeAndroid: true });

    const first = await engine.request("android.permission.POST_NOTIFICATIONS");
    const second = await engine.request("android.permission.POST_NOTIFICATIONS");
    const checked = await engine.check("android.permission.POST_NOTIFICATIONS");

    expect(first).toBe("denied");
    expect(second).toBe("blocked");
    expect(checked).toBe("blocked");
  });

  it("check() stays denied when request cache says denied (no lie to correct)", async () => {
    const { createRNPEngine: create, rnp } = await loadWithPlatform("android", 33);
    rnp.request.mockResolvedValue("denied");
    rnp.check.mockResolvedValue("denied");
    const engine = create({ normalizeAndroid: true });

    await engine.request("android.permission.POST_NOTIFICATIONS");
    const checked = await engine.check("android.permission.POST_NOTIFICATIONS");

    expect(checked).toBe("denied");
  });

  it("notifications cache replay is scoped to POST_NOTIFICATIONS (CAMERA unaffected)", async () => {
    const { createRNPEngine: create, rnp } = await loadWithPlatform("android", 33);
    rnp.request.mockResolvedValue("blocked");
    rnp.check.mockResolvedValue("denied");
    const engine = create({ normalizeAndroid: true });

    // Drive CAMERA cache to blocked via two requests.
    await engine.request("android.permission.CAMERA");
    const camSecond = await engine.request("android.permission.CAMERA");
    const camChecked = await engine.check("android.permission.CAMERA");

    expect(camSecond).toBe("blocked");
    // CAMERA check() should NOT be rewritten — heuristic is POST_NOTIFICATIONS-only.
    expect(camChecked).toBe("denied");
  });

  it("notifications cache replay does not fire when normalizeAndroid is false", async () => {
    const { createRNPEngine: create, rnp } = await loadWithPlatform("android", 33);
    rnp.request.mockResolvedValue("blocked");
    rnp.check.mockResolvedValue("denied");
    const engine = create();

    await engine.request("android.permission.POST_NOTIFICATIONS");
    await engine.request("android.permission.POST_NOTIFICATIONS");
    const checked = await engine.check("android.permission.POST_NOTIFICATIONS");

    // Without the flag, raw RNP `denied` from check() passes through untouched.
    expect(checked).toBe("denied");
  });

  it("notifications cache replay is no-op on iOS", async () => {
    const { createRNPEngine: create, rnp } = await loadWithPlatform("ios", 17);
    rnp.request.mockResolvedValue("blocked");
    rnp.check.mockResolvedValue("denied");
    const engine = create({ normalizeAndroid: true });

    // On iOS the whole android normalization pipeline is a no-op.
    await engine.request("android.permission.POST_NOTIFICATIONS");
    await engine.request("android.permission.POST_NOTIFICATIONS");
    const checked = await engine.check("android.permission.POST_NOTIFICATIONS");

    expect(checked).toBe("denied");
  });

  it("request() increments count BEFORE reading, so first call sees count=1", async () => {
    // Sanity: requestCount < 2 means counts 0 and 1 both map blocked→denied.
    // Because request() increments first, first call sees count=1, still < 2 → denied.
    // Second call sees count=2, not < 2 → blocked passes through.
    const { createRNPEngine: create, rnp } = await loadWithPlatform("android", 34);
    rnp.request.mockResolvedValue("blocked");
    const engine = create({ normalizeAndroid: true });

    expect(await engine.request("android.permission.CAMERA")).toBe("denied");
    expect(await engine.request("android.permission.CAMERA")).toBe("blocked");
  });
});

describe("Permissions.BUNDLES", () => {
  it("BLUETOOTH returns a non-empty string[] (iOS mocked platform)", () => {
    const bundle = Permissions.BUNDLES.BLUETOOTH;
    expect(Array.isArray(bundle)).toBe(true);
    expect(bundle.length).toBeGreaterThan(0);
    for (const entry of bundle) {
      expect(typeof entry).toBe("string");
    }
    expect(bundle).toEqual(["ios.permission.BLUETOOTH"]);
  });

  it("LOCATION_BACKGROUND on iOS returns only [LOCATION_WHEN_IN_USE] (single authorization model)", () => {
    // Top-of-file react-native mock sets OS="ios", so this exercises the iOS branch.
    expect(Permissions.BUNDLES.LOCATION_BACKGROUND).toEqual([Permissions.LOCATION_WHEN_IN_USE]);
  });

  it("LOCATION_BACKGROUND on Android returns [ACCESS_FINE_LOCATION, ACCESS_BACKGROUND_LOCATION]", async () => {
    vi.resetModules();
    vi.doMock("react-native", () => ({
      Platform: {
        OS: "android",
        Version: 33,
        select: (opts: Record<string, string>) => opts.android ?? opts.default,
      },
    }));
    vi.doMock("react-native-permissions", () => ({
      check: vi.fn(),
      request: vi.fn(),
      openSettings: vi.fn(),
      checkNotifications: vi.fn(),
      requestNotifications: vi.fn(),
      PERMISSIONS: {
        IOS: {},
        ANDROID: {
          ACCESS_FINE_LOCATION: "android.permission.ACCESS_FINE_LOCATION",
          BLUETOOTH_SCAN: "android.permission.BLUETOOTH_SCAN",
          BLUETOOTH_CONNECT: "android.permission.BLUETOOTH_CONNECT",
          WRITE_CALENDAR: "android.permission.WRITE_CALENDAR",
        },
      },
    }));
    const { Permissions: AndroidPermissions } = await import("./rnp");
    expect(AndroidPermissions.BUNDLES.LOCATION_BACKGROUND).toEqual([
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_BACKGROUND_LOCATION",
    ]);
    vi.doUnmock("react-native");
    vi.doUnmock("react-native-permissions");
    vi.resetModules();
  });

  it("CALENDARS_WRITE_ONLY returns a single-entry string[]", () => {
    const bundle = Permissions.BUNDLES.CALENDARS_WRITE_ONLY;
    expect(Array.isArray(bundle)).toBe(true);
    expect(bundle.length).toBe(1);
    expect(typeof bundle[0]).toBe("string");
  });
});
