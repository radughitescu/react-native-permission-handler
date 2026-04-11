import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({
  Platform: { select: (opts: Record<string, string>) => opts.ios ?? opts.default },
}));

vi.mock("react-native-permissions", () => ({
  check: vi.fn(),
  request: vi.fn(),
  openSettings: vi.fn(),
  checkNotifications: vi.fn(),
  requestNotifications: vi.fn(),
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
