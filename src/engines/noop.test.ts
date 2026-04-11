import { describe, expect, it } from "vitest";
import { createNoopEngine } from "./noop";

describe("createNoopEngine", () => {
  it("check returns 'granted' by default", async () => {
    const engine = createNoopEngine();
    expect(await engine.check("camera")).toBe("granted");
  });

  it("request returns 'granted' by default", async () => {
    const engine = createNoopEngine();
    expect(await engine.request("camera")).toBe("granted");
  });

  it("openSettings resolves without error", async () => {
    const engine = createNoopEngine();
    await expect(engine.openSettings()).resolves.toBeUndefined();
  });

  it("check returns custom status when configured", async () => {
    const engine = createNoopEngine("blocked");
    expect(await engine.check("camera")).toBe("blocked");
  });

  it("request returns custom status when configured", async () => {
    const engine = createNoopEngine("denied");
    expect(await engine.request("camera")).toBe("denied");
  });

  it("returns same status for any permission string", async () => {
    const engine = createNoopEngine();
    expect(await engine.check("camera")).toBe("granted");
    expect(await engine.check("microphone")).toBe("granted");
    expect(await engine.check("location")).toBe("granted");
  });
});
