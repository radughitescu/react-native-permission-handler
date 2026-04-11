import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionTimeoutError, withTimeout } from "./with-timeout";

describe("withTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves when the promise resolves before timeout", async () => {
    const promise = Promise.resolve("granted");
    const result = await withTimeout(promise, 5000, "camera");
    expect(result).toBe("granted");
  });

  it("rejects with PermissionTimeoutError when promise hangs", async () => {
    const promise = new Promise(() => {}); // never resolves
    const wrapped = withTimeout(promise, 1000, "camera");

    vi.advanceTimersByTime(1000);

    await expect(wrapped).rejects.toThrow(PermissionTimeoutError);
    await expect(wrapped).rejects.toThrow("timed out after 1000ms");
  });

  it("includes permission name in error", async () => {
    const promise = new Promise(() => {});
    const wrapped = withTimeout(promise, 500, "microphone");

    vi.advanceTimersByTime(500);

    try {
      await wrapped;
    } catch (err) {
      expect(err).toBeInstanceOf(PermissionTimeoutError);
      expect((err as PermissionTimeoutError).permission).toBe("microphone");
      expect((err as PermissionTimeoutError).timeoutMs).toBe(500);
    }
  });

  it("clears the timer when promise resolves", async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const promise = Promise.resolve("denied");

    await withTimeout(promise, 5000, "camera");

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it("clears the timer when promise rejects", async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const promise = Promise.reject(new Error("network error"));

    await expect(withTimeout(promise, 5000, "camera")).rejects.toThrow("network error");

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it("propagates original rejection when promise rejects before timeout", async () => {
    const error = new Error("engine error");
    const promise = Promise.reject(error);

    await expect(withTimeout(promise, 5000, "camera")).rejects.toBe(error);
  });
});

describe("PermissionTimeoutError", () => {
  it("has the correct name", () => {
    const error = new PermissionTimeoutError("camera", 1000);
    expect(error.name).toBe("PermissionTimeoutError");
  });

  it("is an instance of Error", () => {
    const error = new PermissionTimeoutError("camera", 1000);
    expect(error).toBeInstanceOf(Error);
  });
});
