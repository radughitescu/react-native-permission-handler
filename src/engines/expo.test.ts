import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExpoPermissionModule } from "./expo";

vi.mock("react-native", () => ({
  Linking: {
    openSettings: vi.fn().mockResolvedValue(undefined),
  },
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
    it("calls Linking.openSettings()", async () => {
      const engine = createExpoEngine({ permissions: {} });

      await engine.openSettings();

      expect(Linking.openSettings).toHaveBeenCalled();
    });
  });
});
