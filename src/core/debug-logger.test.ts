import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDebugLogger } from "./debug-logger";

describe("createDebugLogger", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("logs transitions when enabled", () => {
    const logger = createDebugLogger(true, "camera");
    logger.transition("idle", "checking", "CHECK");

    expect(consoleSpy).toHaveBeenCalledWith("[permission-handler] camera: idle → checking (CHECK)");
  });

  it("does not log when disabled", () => {
    const logger = createDebugLogger(false, "camera");
    logger.transition("idle", "checking", "CHECK");
    logger.info("test");

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("does not log when undefined", () => {
    const logger = createDebugLogger(undefined, "camera");
    logger.transition("idle", "checking");
    logger.info("test");

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("omits event when not provided", () => {
    const logger = createDebugLogger(true, "camera");
    logger.transition("idle", "checking");

    expect(consoleSpy).toHaveBeenCalledWith("[permission-handler] camera: idle → checking");
  });

  it("logs info messages", () => {
    const logger = createDebugLogger(true, "camera");
    logger.info("request timed out");

    expect(consoleSpy).toHaveBeenCalledWith("[permission-handler] camera: request timed out");
  });

  it("uses custom logger function when provided", () => {
    const customLog = vi.fn();
    const logger = createDebugLogger(customLog, "mic");
    logger.transition("idle", "checking", "CHECK");

    expect(customLog).toHaveBeenCalledWith("[permission-handler] mic: idle → checking (CHECK)");
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("includes permission name in all messages", () => {
    const logger = createDebugLogger(true, "notifications");
    logger.transition("prePrompt", "requesting", "PRE_PROMPT_CONFIRM");

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("notifications"));
  });
});
