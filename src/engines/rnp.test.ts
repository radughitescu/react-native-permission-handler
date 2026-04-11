import { beforeEach, describe, expect, it, vi } from "vitest";

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
import { createRNPEngine } from "./rnp";

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
