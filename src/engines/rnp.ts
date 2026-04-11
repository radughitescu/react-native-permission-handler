import { Platform } from "react-native";
import {
  type Permission,
  check,
  checkNotifications,
  openSettings,
  request,
  requestNotifications,
} from "react-native-permissions";
import type { PermissionEngine, PermissionStatus } from "../types";

function p(ios: string, android: string): string {
  return Platform.select({ ios, android, default: ios }) ?? ios;
}

/**
 * Cross-platform permission constants for use with the RNP engine.
 * Each resolves to the correct platform-specific string at runtime.
 */
export const Permissions = {
  CAMERA: p("ios.permission.CAMERA", "android.permission.CAMERA"),
  MICROPHONE: p("ios.permission.MICROPHONE", "android.permission.RECORD_AUDIO"),
  CONTACTS: p("ios.permission.CONTACTS", "android.permission.READ_CONTACTS"),
  CALENDARS: p("ios.permission.CALENDARS", "android.permission.READ_CALENDAR"),
  CALENDARS_WRITE_ONLY: p(
    "ios.permission.CALENDARS_WRITE_ONLY",
    "android.permission.WRITE_CALENDAR",
  ),
  LOCATION_WHEN_IN_USE: p(
    "ios.permission.LOCATION_WHEN_IN_USE",
    "android.permission.ACCESS_FINE_LOCATION",
  ),
  LOCATION_ALWAYS: p(
    "ios.permission.LOCATION_ALWAYS",
    "android.permission.ACCESS_BACKGROUND_LOCATION",
  ),
  PHOTO_LIBRARY: p("ios.permission.PHOTO_LIBRARY", "android.permission.READ_MEDIA_IMAGES"),
  PHOTO_LIBRARY_ADD_ONLY: p(
    "ios.permission.PHOTO_LIBRARY_ADD_ONLY",
    "android.permission.WRITE_EXTERNAL_STORAGE",
  ),
  BLUETOOTH: p("ios.permission.BLUETOOTH", "android.permission.BLUETOOTH_CONNECT"),
  NOTIFICATIONS: "notifications",
} as const;

export function createRNPEngine(): PermissionEngine {
  return {
    async check(permission: string): Promise<PermissionStatus> {
      if (permission === "notifications") {
        const result = await checkNotifications();
        return result.status as PermissionStatus;
      }
      return (await check(permission as Permission)) as PermissionStatus;
    },

    async request(permission: string): Promise<PermissionStatus> {
      if (permission === "notifications") {
        const result = await requestNotifications(["alert", "badge", "sound"]);
        return result.status as PermissionStatus;
      }
      return (await request(permission as Permission)) as PermissionStatus;
    },

    async openSettings(): Promise<void> {
      await openSettings();
    },
  };
}
