import { describe, expect, it } from "vitest";
import {
  type NormalizationContext,
  normalizeAndroidStatus,
  normalizeDialogDismissAsDenied,
  normalizePostNotificationsPreApi33,
} from "./rnp-normalization";

const androidCtx = (overrides: Partial<NormalizationContext> = {}): NormalizationContext => ({
  platform: "android",
  apiLevel: 34,
  requestCount: 0,
  ...overrides,
});

describe("normalizeAndroidStatus", () => {
  it("is a no-op on iOS regardless of input status", () => {
    for (const status of ["granted", "denied", "blocked", "limited", "unavailable"] as const) {
      expect(
        normalizeAndroidStatus({
          permission: "android.permission.POST_NOTIFICATIONS",
          status,
          context: { platform: "ios", apiLevel: 0, requestCount: 0 },
        }),
      ).toBe(status);
    }
  });

  it("applies both heuristics in sequence on android", () => {
    // POST_NOTIFICATIONS denied on API 30 → granted (first heuristic fires)
    expect(
      normalizeAndroidStatus({
        permission: "android.permission.POST_NOTIFICATIONS",
        status: "denied",
        context: androidCtx({ apiLevel: 30 }),
      }),
    ).toBe("granted");
  });
});

describe("normalizePostNotificationsPreApi33", () => {
  it("rewrites POST_NOTIFICATIONS denied on apiLevel=32 → granted", () => {
    expect(
      normalizePostNotificationsPreApi33(
        "android.permission.POST_NOTIFICATIONS",
        "denied",
        androidCtx({ apiLevel: 32 }),
      ),
    ).toBe("granted");
  });

  it("leaves POST_NOTIFICATIONS denied on apiLevel=33 unchanged", () => {
    expect(
      normalizePostNotificationsPreApi33(
        "android.permission.POST_NOTIFICATIONS",
        "denied",
        androidCtx({ apiLevel: 33 }),
      ),
    ).toBe("denied");
  });

  it("leaves non-POST_NOTIFICATIONS permissions unchanged on apiLevel=30", () => {
    expect(
      normalizePostNotificationsPreApi33(
        "android.permission.CAMERA",
        "denied",
        androidCtx({ apiLevel: 30 }),
      ),
    ).toBe("denied");
  });

  it("leaves POST_NOTIFICATIONS granted unchanged on apiLevel=30 (not denied)", () => {
    expect(
      normalizePostNotificationsPreApi33(
        "android.permission.POST_NOTIFICATIONS",
        "granted",
        androidCtx({ apiLevel: 30 }),
      ),
    ).toBe("granted");
  });

  it("leaves POST_NOTIFICATIONS blocked unchanged on apiLevel=30 (only denied is rewritten)", () => {
    expect(
      normalizePostNotificationsPreApi33(
        "android.permission.POST_NOTIFICATIONS",
        "blocked",
        androidCtx({ apiLevel: 30 }),
      ),
    ).toBe("blocked");
  });
});

describe("normalizeDialogDismissAsDenied", () => {
  it("rewrites blocked → denied when requestCount=0", () => {
    expect(normalizeDialogDismissAsDenied("blocked", androidCtx({ requestCount: 0 }))).toBe(
      "denied",
    );
  });

  it("rewrites blocked → denied when requestCount=1", () => {
    expect(normalizeDialogDismissAsDenied("blocked", androidCtx({ requestCount: 1 }))).toBe(
      "denied",
    );
  });

  it("leaves blocked unchanged when requestCount=2 (genuine block)", () => {
    expect(normalizeDialogDismissAsDenied("blocked", androidCtx({ requestCount: 2 }))).toBe(
      "blocked",
    );
  });

  it("leaves blocked unchanged when requestCount=5", () => {
    expect(normalizeDialogDismissAsDenied("blocked", androidCtx({ requestCount: 5 }))).toBe(
      "blocked",
    );
  });

  it("leaves denied unchanged (not blocked, no-op)", () => {
    expect(normalizeDialogDismissAsDenied("denied", androidCtx({ requestCount: 0 }))).toBe(
      "denied",
    );
  });

  it("leaves granted unchanged", () => {
    expect(normalizeDialogDismissAsDenied("granted", androidCtx({ requestCount: 0 }))).toBe(
      "granted",
    );
  });
});
