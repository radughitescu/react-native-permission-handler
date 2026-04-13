import type { PermissionStatus } from "../types";

export interface NormalizationContext {
  platform: "ios" | "android";
  apiLevel: number;
  /** Count of request() calls for this specific permission in the current engine instance. */
  requestCount: number;
  /**
   * The last status returned by `request()` for this permission, or null if
   * no request has been made yet. Used to correct stale `check()` results
   * for permissions that lie about blocked state (e.g., Android 13+ notifications).
   */
  lastRequestStatus: PermissionStatus | null;
}

export interface NormalizationInput {
  permission: string;
  status: PermissionStatus;
  context: NormalizationContext;
}

/**
 * Master normalization entry point. Applies each heuristic in order.
 * Pure function — no side effects, no global state. No-op on iOS.
 */
export function normalizeAndroidStatus(input: NormalizationInput): PermissionStatus {
  if (input.context.platform !== "android") return input.status;
  let status = input.status;
  status = normalizePostNotificationsPreApi33(input.permission, status, input.context);
  status = normalizeDialogDismissAsDenied(status, input.context);
  status = normalizeNotificationsCheckFromRequestCache(
    input.permission,
    status,
    input.context.lastRequestStatus,
  );
  return status;
}

/**
 * On Android 13+, checkNotifications() returns `denied` even after the user
 * explicitly blocked the permission via request(). If we have a cached
 * request() result saying the permission was blocked, prefer that.
 *
 * Only runs for POST_NOTIFICATIONS and only rewrites denied → blocked when
 * the last request returned blocked. Does not affect genuine fresh denials.
 */
export function normalizeNotificationsCheckFromRequestCache(
  permission: string,
  status: PermissionStatus,
  lastRequestStatus: PermissionStatus | null,
): PermissionStatus {
  if (permission !== "android.permission.POST_NOTIFICATIONS") return status;
  if (status !== "denied") return status;
  if (lastRequestStatus === "blocked") return "blocked";
  return status;
}

/**
 * On Android API < 33, POST_NOTIFICATIONS does not exist as a runtime
 * permission. RNP returns `denied` — rewrite to `granted`.
 */
export function normalizePostNotificationsPreApi33(
  permission: string,
  status: PermissionStatus,
  context: NormalizationContext,
): PermissionStatus {
  if (context.apiLevel >= 33) return status;
  if (permission === "android.permission.POST_NOTIFICATIONS" && status === "denied") {
    return "granted";
  }
  return status;
}

/**
 * Dialog dismissal (user swipes away without choosing) is misreported as
 * `blocked` on some Android versions. Until requestCount reaches 2 (Android's
 * 2-denial auto-block threshold), treat `blocked` as `denied`.
 */
export function normalizeDialogDismissAsDenied(
  status: PermissionStatus,
  context: NormalizationContext,
): PermissionStatus {
  if (status !== "blocked") return status;
  if (context.requestCount < 2) return "denied";
  return status;
}
