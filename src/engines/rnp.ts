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

function p(ios: string, android: string | { below33: string; from33: string }): string {
  if (Platform.OS === "ios") return ios;
  if (typeof android === "string") return android;
  const apiLevel = typeof Platform.Version === "number" ? Platform.Version : 33;
  return apiLevel >= 33 ? android.from33 : android.below33;
}

/**
 * Cross-platform permission constants that resolve to the correct
 * platform-specific string at runtime via Platform.select.
 */
export const Permissions = {
  // Cross-platform
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
  PHOTO_LIBRARY: p("ios.permission.PHOTO_LIBRARY", {
    below33: "android.permission.READ_EXTERNAL_STORAGE",
    from33: "android.permission.READ_MEDIA_IMAGES",
  }),
  PHOTO_LIBRARY_ADD_ONLY: p(
    "ios.permission.PHOTO_LIBRARY_ADD_ONLY",
    "android.permission.WRITE_EXTERNAL_STORAGE",
  ),
  MEDIA_LIBRARY: p("ios.permission.MEDIA_LIBRARY", {
    below33: "android.permission.READ_EXTERNAL_STORAGE",
    from33: "android.permission.READ_MEDIA_AUDIO",
  }),
  VIDEO_LIBRARY: p("ios.permission.PHOTO_LIBRARY", {
    below33: "android.permission.READ_EXTERNAL_STORAGE",
    from33: "android.permission.READ_MEDIA_VIDEO",
  }),
  BLUETOOTH: p("ios.permission.BLUETOOTH", "android.permission.BLUETOOTH_CONNECT"),
  SPEECH_RECOGNITION: p("ios.permission.SPEECH_RECOGNITION", "android.permission.RECORD_AUDIO"),
  MOTION: p("ios.permission.MOTION", "android.permission.ACTIVITY_RECOGNITION"),
  NOTIFICATIONS: "notifications",

  // iOS-only
  IOS: {
    APP_TRACKING_TRANSPARENCY: "ios.permission.APP_TRACKING_TRANSPARENCY",
    FACE_ID: "ios.permission.FACE_ID",
    REMINDERS: "ios.permission.REMINDERS",
    SIRI: "ios.permission.SIRI",
    STOREKIT: "ios.permission.STOREKIT",
  },

  // Android-only
  ANDROID: {
    ACCEPT_HANDOVER: "android.permission.ACCEPT_HANDOVER",
    ACCESS_COARSE_LOCATION: "android.permission.ACCESS_COARSE_LOCATION",
    ACCESS_MEDIA_LOCATION: "android.permission.ACCESS_MEDIA_LOCATION",
    ADD_VOICEMAIL: "com.android.voicemail.permission.ADD_VOICEMAIL",
    ANSWER_PHONE_CALLS: "android.permission.ANSWER_PHONE_CALLS",
    BLUETOOTH_ADVERTISE: "android.permission.BLUETOOTH_ADVERTISE",
    BLUETOOTH_SCAN: "android.permission.BLUETOOTH_SCAN",
    BODY_SENSORS: "android.permission.BODY_SENSORS",
    BODY_SENSORS_BACKGROUND: "android.permission.BODY_SENSORS_BACKGROUND",
    CALL_PHONE: "android.permission.CALL_PHONE",
    GET_ACCOUNTS: "android.permission.GET_ACCOUNTS",
    NEARBY_WIFI_DEVICES: "android.permission.NEARBY_WIFI_DEVICES",
    PROCESS_OUTGOING_CALLS: "android.permission.PROCESS_OUTGOING_CALLS",
    READ_CALL_LOG: "android.permission.READ_CALL_LOG",
    READ_EXTERNAL_STORAGE: "android.permission.READ_EXTERNAL_STORAGE",
    READ_MEDIA_AUDIO: "android.permission.READ_MEDIA_AUDIO",
    READ_MEDIA_IMAGES: "android.permission.READ_MEDIA_IMAGES",
    READ_MEDIA_VIDEO: "android.permission.READ_MEDIA_VIDEO",
    READ_MEDIA_VISUAL_USER_SELECTED: "android.permission.READ_MEDIA_VISUAL_USER_SELECTED",
    READ_PHONE_NUMBERS: "android.permission.READ_PHONE_NUMBERS",
    READ_PHONE_STATE: "android.permission.READ_PHONE_STATE",
    READ_SMS: "android.permission.READ_SMS",
    RECEIVE_MMS: "android.permission.RECEIVE_MMS",
    RECEIVE_SMS: "android.permission.RECEIVE_SMS",
    RECEIVE_WAP_PUSH: "android.permission.RECEIVE_WAP_PUSH",
    SEND_SMS: "android.permission.SEND_SMS",
    USE_SIP: "android.permission.USE_SIP",
    UWB_RANGING: "android.permission.UWB_RANGING",
    WRITE_CALL_LOG: "android.permission.WRITE_CALL_LOG",
    WRITE_CONTACTS: "android.permission.WRITE_CONTACTS",
    WRITE_EXTERNAL_STORAGE: "android.permission.WRITE_EXTERNAL_STORAGE",
  },
} as const;

export interface RNPEngineOptions {
  /**
   * When true, rewrites `unavailable` → `blocked` for photo library permissions
   * (`PHOTO_LIBRARY`, `PHOTO_LIBRARY_ADD_ONLY`). This is opt-in because iOS may
   * return `unavailable` for photo library in edge cases where the user can
   * still recover access via Settings — normalizing to `blocked` surfaces the
   * recovery flow instead of permanently hiding the feature. Defaults to false.
   */
  normalizePhotoLibrary?: boolean;
}

export function createRNPEngine(options: RNPEngineOptions = {}): PermissionEngine {
  const photoPermissions = new Set<string>([
    Permissions.PHOTO_LIBRARY,
    Permissions.PHOTO_LIBRARY_ADD_ONLY,
  ]);

  function maybeNormalize(permission: string, status: PermissionStatus): PermissionStatus {
    if (
      options.normalizePhotoLibrary &&
      status === "unavailable" &&
      photoPermissions.has(permission)
    ) {
      return "blocked";
    }
    return status;
  }

  return {
    async check(permission: string): Promise<PermissionStatus> {
      if (permission === "notifications") {
        const result = await checkNotifications();
        return maybeNormalize(permission, result.status as PermissionStatus);
      }
      const status = (await check(permission as Permission)) as PermissionStatus;
      return maybeNormalize(permission, status);
    },

    async request(permission: string): Promise<PermissionStatus> {
      if (permission === "notifications") {
        const result = await requestNotifications(["alert", "badge", "sound"]);
        return maybeNormalize(permission, result.status as PermissionStatus);
      }
      const status = (await request(permission as Permission)) as PermissionStatus;
      return maybeNormalize(permission, status);
    },

    async openSettings(): Promise<void> {
      await openSettings();
    },
  };
}
