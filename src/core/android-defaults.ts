import { Platform } from "react-native";

export const ANDROID_16_REQUEST_TIMEOUT_MS = 5000;

/**
 * Returns the effective requestTimeout for a permission request. If the
 * user explicitly set a value, use it. Otherwise, on Android 16+ (SDK 36+)
 * apply a 5s default to recover from the known requestPermissions hang.
 * Returns undefined on all other platforms/versions.
 */
export function getDefaultRequestTimeout(userValue: number | undefined): number | undefined {
  if (userValue !== undefined) return userValue;
  if (Platform.OS !== "android") return undefined;
  const version = typeof Platform.Version === "number" ? Platform.Version : 0;
  if (version >= 36) return ANDROID_16_REQUEST_TIMEOUT_MS;
  return undefined;
}
