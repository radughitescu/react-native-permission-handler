import { describe, expect, it } from "vitest";
import { createTestingEngine } from "./testing";

describe("createTestingEngine", () => {
  it("check returns 'denied' by default for unseeded permissions", async () => {
    const engine = createTestingEngine();
    expect(await engine.check("camera")).toBe("denied");
  });

  it("request returns 'denied' by default for unseeded permissions (symmetric)", async () => {
    const engine = createTestingEngine();
    expect(await engine.request("camera")).toBe("denied");
  });

  it("request returns 'granted' for unseeded permissions when autoGrantUnset is true", async () => {
    const engine = createTestingEngine({}, { autoGrantUnset: true });
    expect(await engine.request("camera")).toBe("granted");
    expect(await engine.check("camera")).toBe("denied");
  });

  it("openSettings resolves without error", async () => {
    const engine = createTestingEngine();
    await expect(engine.openSettings()).resolves.toBeUndefined();
  });

  it("respects initial statuses for check", async () => {
    const engine = createTestingEngine({ camera: "granted", microphone: "blocked" });
    expect(await engine.check("camera")).toBe("granted");
    expect(await engine.check("microphone")).toBe("blocked");
  });

  it("request returns status from initial config", async () => {
    const engine = createTestingEngine({ camera: "blocked" });
    expect(await engine.request("camera")).toBe("blocked");
  });

  it("setStatus changes what check and request return", async () => {
    const engine = createTestingEngine();
    expect(await engine.check("camera")).toBe("denied");

    engine.setStatus("camera", "granted");
    expect(await engine.check("camera")).toBe("granted");
    expect(await engine.request("camera")).toBe("granted");
  });

  it("tracks check and request calls in history", async () => {
    const engine = createTestingEngine();
    await engine.check("camera");
    await engine.request("microphone");
    await engine.check("location");

    expect(engine.getRequestHistory()).toEqual([
      { permission: "camera", method: "check" },
      { permission: "microphone", method: "request" },
      { permission: "location", method: "check" },
    ]);
  });

  it("reset clears history and restores initial statuses", async () => {
    const engine = createTestingEngine({ camera: "denied" });

    engine.setStatus("camera", "granted");
    await engine.check("camera");
    expect(engine.getRequestHistory()).toHaveLength(1);
    expect(await engine.check("camera")).toBe("granted");

    engine.reset();
    expect(engine.getRequestHistory()).toEqual([]);
    expect(await engine.check("camera")).toBe("denied");
  });

  it("returns symmetric 'denied' defaults for permissions not in initial config", async () => {
    const engine = createTestingEngine({ camera: "granted" });
    expect(await engine.check("microphone")).toBe("denied");
    expect(await engine.request("microphone")).toBe("denied");
  });
});
