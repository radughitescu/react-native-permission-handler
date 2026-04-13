import { beforeEach, describe, expect, it, vi } from "vitest";

async function loadWithPlatform(os: string, version: number) {
  vi.resetModules();
  vi.doMock("react-native", () => ({
    Platform: { OS: os, Version: version },
  }));
  return await import("./android-defaults");
}

describe("getDefaultRequestTimeout", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns user value when provided, even on iOS", async () => {
    const { getDefaultRequestTimeout } = await loadWithPlatform("ios", 17);
    expect(getDefaultRequestTimeout(1234)).toBe(1234);
  });

  it("returns user value when provided, even on Android 15 (SDK 35)", async () => {
    const { getDefaultRequestTimeout } = await loadWithPlatform("android", 35);
    expect(getDefaultRequestTimeout(1234)).toBe(1234);
  });

  it("returns 5000 when userValue is undefined on Android 16+ (SDK 36)", async () => {
    const { getDefaultRequestTimeout, ANDROID_16_REQUEST_TIMEOUT_MS } = await loadWithPlatform(
      "android",
      36,
    );
    expect(getDefaultRequestTimeout(undefined)).toBe(5000);
    expect(ANDROID_16_REQUEST_TIMEOUT_MS).toBe(5000);
  });

  it("returns undefined when userValue is undefined on Android 15 and below (SDK 35)", async () => {
    const { getDefaultRequestTimeout } = await loadWithPlatform("android", 35);
    expect(getDefaultRequestTimeout(undefined)).toBeUndefined();
  });

  it("returns undefined when userValue is undefined on iOS", async () => {
    const { getDefaultRequestTimeout } = await loadWithPlatform("ios", 17);
    expect(getDefaultRequestTimeout(undefined)).toBeUndefined();
  });
});
