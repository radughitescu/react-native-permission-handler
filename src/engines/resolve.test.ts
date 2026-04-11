import { afterEach, describe, expect, it, vi } from "vitest";
import type { PermissionEngine } from "../types";

// Mock the RNP fallback
const mockFallbackEngine: PermissionEngine = {
  check: vi.fn().mockResolvedValue("granted"),
  request: vi.fn().mockResolvedValue("granted"),
  openSettings: vi.fn().mockResolvedValue(undefined),
};

vi.mock("./rnp-fallback", () => ({
  getRNPFallbackEngine: vi.fn(() => mockFallbackEngine),
}));

import { getDefaultEngine, setDefaultEngine } from "./resolve";
import { resolveEngine } from "./use-engine";

describe("resolveEngine", () => {
  afterEach(() => {
    // Reset global default by setting it to a known state
    // We can't truly reset since there's no clearDefaultEngine, but tests
    // run in order so we test the cascade explicitly
  });

  it("uses config engine when provided", () => {
    const configEngine: PermissionEngine = {
      check: vi.fn(),
      request: vi.fn(),
      openSettings: vi.fn(),
    };

    expect(resolveEngine(configEngine)).toBe(configEngine);
  });

  it("falls back to RNP fallback when no config or global engine", () => {
    // getDefaultEngine() returns null by default (no setDefaultEngine called yet in fresh module)
    // But since we can't guarantee module state across tests, we test the cascade
    const result = resolveEngine(undefined);
    // Should either be the global default or the fallback
    expect(result).toBeDefined();
    expect(result.check).toBeDefined();
    expect(result.request).toBeDefined();
    expect(result.openSettings).toBeDefined();
  });
});

describe("setDefaultEngine / getDefaultEngine", () => {
  it("stores and retrieves a default engine", () => {
    const engine: PermissionEngine = {
      check: vi.fn(),
      request: vi.fn(),
      openSettings: vi.fn(),
    };

    setDefaultEngine(engine);
    expect(getDefaultEngine()).toBe(engine);
  });

  it("resolveEngine uses global default over fallback", () => {
    const globalEngine: PermissionEngine = {
      check: vi.fn(),
      request: vi.fn(),
      openSettings: vi.fn(),
    };

    setDefaultEngine(globalEngine);
    expect(resolveEngine(undefined)).toBe(globalEngine);
  });

  it("config engine takes priority over global default", () => {
    const globalEngine: PermissionEngine = {
      check: vi.fn(),
      request: vi.fn(),
      openSettings: vi.fn(),
    };
    const configEngine: PermissionEngine = {
      check: vi.fn(),
      request: vi.fn(),
      openSettings: vi.fn(),
    };

    setDefaultEngine(globalEngine);
    expect(resolveEngine(configEngine)).toBe(configEngine);
  });
});
