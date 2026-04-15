/**
 * Best-effort iOS Settings deep-link mapper.
 *
 * Given a permission identifier (RNP constant, Expo key, or plain string),
 * returns the iOS Settings "path" to deep-link into. Returns null for
 * permissions where iOS does not expose a dedicated sub-page (notifications,
 * motion, tracking) — callers should fall back to the generic Settings entry.
 *
 * Matching is lowercase + substring-based to accept every common input form:
 * - RNP constants: `ios.permission.CAMERA`, `ios.permission.LOCATION_WHEN_IN_USE`
 * - Expo keys: `camera`, `locationForeground`, `mediaLibrary`
 * - Raw strings: `camera`, `location`, `photo`
 */
export function iosSettingsPath(permission: string): string | null {
  const p = permission.toLowerCase();
  if (p.includes("camera")) return "CAMERA";
  if (p.includes("microphone") || p.includes("record_audio")) return "MICROPHONE";
  if (
    p.includes("photo") ||
    p.includes("medialibrary") ||
    p.includes("media_library") ||
    p.includes("read_media")
  ) {
    return "PHOTOS";
  }
  if (p.includes("location")) return "LOCATION";
  if (p.includes("contacts")) return "CONTACTS";
  if (p.includes("calendar")) return "CALENDARS";
  if (p.includes("reminder")) return "REMINDERS";
  if (p.includes("motion")) return "MOTION";
  if (p.includes("bluetooth")) return "BLUETOOTH";
  return null;
}

/**
 * Build the full iOS Settings deep-link URL for a given permission, or null
 * if there's no known mapping. The URL uses the unofficial but long-standing
 * `App-Prefs:` scheme which may fail silently on some iOS versions — callers
 * must wrap `Linking.openURL` in try/catch and fall back to generic Settings
 * if it throws.
 */
export function iosSettingsUrl(permission: string): string | null {
  const path = iosSettingsPath(permission);
  if (!path) return null;
  return `App-Prefs:root=Privacy&path=${path}`;
}
