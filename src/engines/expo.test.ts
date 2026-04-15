import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExpoPermissionModule } from "./expo";

vi.mock("react-native", () => ({
  Linking: {
    openSettings: vi.fn().mockResolvedValue(undefined),
    openURL: vi.fn().mockResolvedValue(undefined),
  },
  Platform: { OS: "ios" },
}));

import { Linking } from "react-native";
import { createExpoEngine } from "./expo";

function createMockModule(overrides?: Partial<ExpoPermissionModule>): ExpoPermissionModule {
  return {
    getPermissionsAsync: vi.fn().mockResolvedValue({ status: "granted", canAskAgain: true }),
    requestPermissionsAsync: vi.fn().mockResolvedValue({ status: "granted", canAskAgain: true }),
    ...overrides,
  };
}

describe("createExpoEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("status mapping", () => {
    it("maps 'granted' to 'granted'", async () => {
      const camera = createMockModule({
        getPermissionsAsync: vi.fn().mockResolvedValue({ status: "granted", canAskAgain: true }),
      });
      const engine = createExpoEngine({ permissions: { camera } });

      expect(await engine.check("camera")).toBe("granted");
    });

    it("maps 'undetermined' to 'denied'", async () => {
      const camera = createMockModule({
        getPermissionsAsync: vi
          .fn()
          .mockResolvedValue({ status: "undetermined", canAskAgain: true }),
      });
      const engine = createExpoEngine({ permissions: { camera } });

      expect(await engine.check("camera")).toBe("denied");
    });

    it("maps 'denied' + canAskAgain:true to 'denied'", async () => {
      const camera = createMockModule({
        getPermissionsAsync: vi.fn().mockResolvedValue({ status: "denied", canAskAgain: true }),
      });
      const engine = createExpoEngine({ permissions: { camera } });

      expect(await engine.check("camera")).toBe("denied");
    });

    it("maps 'denied' + canAskAgain:false to 'blocked'", async () => {
      const camera = createMockModule({
        getPermissionsAsync: vi.fn().mockResolvedValue({ status: "denied", canAskAgain: false }),
      });
      const engine = createExpoEngine({ permissions: { camera } });

      expect(await engine.check("camera")).toBe("blocked");
    });

    it("maps unknown status to 'unavailable'", async () => {
      const camera = createMockModule({
        getPermissionsAsync: vi
          .fn()
          .mockResolvedValue({ status: "something_else", canAskAgain: true }),
      });
      const engine = createExpoEngine({ permissions: { camera } });

      expect(await engine.check("camera")).toBe("unavailable");
    });
  });

  describe("check", () => {
    it("calls getPermissionsAsync on the correct module", async () => {
      const camera = createMockModule();
      const location = createMockModule();
      const engine = createExpoEngine({ permissions: { camera, location } });

      await engine.check("camera");

      expect(camera.getPermissionsAsync).toHaveBeenCalled();
      expect(location.getPermissionsAsync).not.toHaveBeenCalled();
    });

    it("returns 'unavailable' for unknown permissions", async () => {
      const engine = createExpoEngine({ permissions: {} });

      expect(await engine.check("unknown")).toBe("unavailable");
    });
  });

  describe("request", () => {
    it("calls requestPermissionsAsync on the correct module", async () => {
      const camera = createMockModule();
      const engine = createExpoEngine({ permissions: { camera } });

      await engine.request("camera");

      expect(camera.requestPermissionsAsync).toHaveBeenCalled();
    });

    it("returns 'unavailable' for unknown permissions", async () => {
      const engine = createExpoEngine({ permissions: {} });

      expect(await engine.request("unknown")).toBe("unavailable");
    });
  });

  describe("openSettings", () => {
    it("calls Linking.openSettings() when no permission is passed", async () => {
      const engine = createExpoEngine({ permissions: {} });

      await engine.openSettings();

      expect(Linking.openSettings).toHaveBeenCalled();
      expect(Linking.openURL).not.toHaveBeenCalled();
    });

    it("deep-links to iOS sub-page when a known permission is passed", async () => {
      const engine = createExpoEngine({ permissions: {} });

      await engine.openSettings("camera");

      expect(Linking.openURL).toHaveBeenCalledWith("App-Prefs:root=Privacy&path=CAMERA");
      expect(Linking.openSettings).not.toHaveBeenCalled();
    });

    it("falls back to generic openSettings when iOS openURL rejects", async () => {
      vi.mocked(Linking.openURL).mockRejectedValueOnce(new Error("rejected"));
      const engine = createExpoEngine({ permissions: {} });

      await engine.openSettings("camera");

      expect(Linking.openURL).toHaveBeenCalled();
      expect(Linking.openSettings).toHaveBeenCalled();
    });

    it("falls back to generic openSettings for unmapped permissions", async () => {
      const engine = createExpoEngine({ permissions: {} });

      await engine.openSettings("notifications");

      expect(Linking.openURL).not.toHaveBeenCalled();
      expect(Linking.openSettings).toHaveBeenCalled();
    });
  });

  describe("zero-config (auto-discovery)", () => {
    it("creates engine with no arguments", () => {
      // In test environment no expo modules are installed, so all return unavailable
      const engine = createExpoEngine();
      expect(engine.check).toBeDefined();
      expect(engine.request).toBeDefined();
      expect(engine.openSettings).toBeDefined();
    });

    it("returns unavailable for undiscovered permissions", async () => {
      const engine = createExpoEngine();
      expect(await engine.check("camera")).toBe("unavailable");
    });

    it("user config overrides discovered defaults", async () => {
      const customModule = createMockModule({
        getPermissionsAsync: vi.fn().mockResolvedValue({ status: "granted", canAskAgain: true }),
      });

      const engine = createExpoEngine({
        permissions: { camera: customModule },
      });

      expect(await engine.check("camera")).toBe("granted");
    });
  });

  describe("non-standard module names (ExpoPermissionFunctions)", () => {
    it("works with explicit get/request functions", async () => {
      const getFn = vi.fn().mockResolvedValue({ status: "granted", canAskAgain: true });
      const requestFn = vi.fn().mockResolvedValue({ status: "denied", canAskAgain: false });

      const engine = createExpoEngine({
        permissions: {
          camera: { get: getFn, request: requestFn },
        },
      });

      expect(await engine.check("camera")).toBe("granted");
      expect(getFn).toHaveBeenCalled();

      expect(await engine.request("camera")).toBe("blocked");
      expect(requestFn).toHaveBeenCalled();
    });

    it("simulates expo-camera with getCameraPermissionsAsync", async () => {
      // This is how users would wire up expo-camera
      const mockCamera = {
        getCameraPermissionsAsync: vi
          .fn()
          .mockResolvedValue({ status: "denied", canAskAgain: true }),
        requestCameraPermissionsAsync: vi
          .fn()
          .mockResolvedValue({ status: "granted", canAskAgain: true }),
      };

      const engine = createExpoEngine({
        permissions: {
          camera: {
            get: () => mockCamera.getCameraPermissionsAsync(),
            request: () => mockCamera.requestCameraPermissionsAsync(),
          },
        },
      });

      expect(await engine.check("camera")).toBe("denied");
      expect(await engine.request("camera")).toBe("granted");
    });

    it("simulates expo-location foreground + background as separate entries", async () => {
      const mockLocation = {
        getForegroundPermissionsAsync: vi
          .fn()
          .mockResolvedValue({ status: "granted", canAskAgain: true }),
        requestForegroundPermissionsAsync: vi
          .fn()
          .mockResolvedValue({ status: "granted", canAskAgain: true }),
        getBackgroundPermissionsAsync: vi
          .fn()
          .mockResolvedValue({ status: "denied", canAskAgain: false }),
        requestBackgroundPermissionsAsync: vi
          .fn()
          .mockResolvedValue({ status: "denied", canAskAgain: false }),
      };

      const engine = createExpoEngine({
        permissions: {
          locationForeground: {
            get: () => mockLocation.getForegroundPermissionsAsync(),
            request: () => mockLocation.requestForegroundPermissionsAsync(),
          },
          locationBackground: {
            get: () => mockLocation.getBackgroundPermissionsAsync(),
            request: () => mockLocation.requestBackgroundPermissionsAsync(),
          },
        },
      });

      expect(await engine.check("locationForeground")).toBe("granted");
      expect(await engine.check("locationBackground")).toBe("blocked");
    });
  });
});
