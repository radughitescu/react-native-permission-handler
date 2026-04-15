import { Linking, Platform } from "react-native";
import type { PermissionEngine, PermissionStatus } from "../types";
import { iosSettingsUrl } from "./ios-settings-links";

type ExpoPermissionResponse = { status: string; canAskAgain: boolean };

/**
 * An Expo module with standard permission methods (getPermissionsAsync/requestPermissionsAsync).
 * Works with: expo-media-library, expo-notifications, expo-contacts, expo-brightness,
 * expo-screen-capture, expo-cellular, expo-av, expo-sensors, expo-maps.
 */
export interface ExpoPermissionModule {
  getPermissionsAsync: () => Promise<ExpoPermissionResponse>;
  requestPermissionsAsync: () => Promise<ExpoPermissionResponse>;
}

/**
 * Explicit get/request function pair for modules with non-standard method names.
 * Use this for: expo-camera, expo-location, expo-calendar, expo-image-picker,
 * expo-tracking-transparency, expo-audio.
 */
export interface ExpoPermissionFunctions {
  get: () => Promise<ExpoPermissionResponse>;
  request: () => Promise<ExpoPermissionResponse>;
}

export type ExpoPermissionEntry = ExpoPermissionModule | ExpoPermissionFunctions;

export interface ExpoEngineConfig {
  permissions?: Record<string, ExpoPermissionEntry>;
}

function resolveEntry(entry: ExpoPermissionEntry): {
  get: () => Promise<ExpoPermissionResponse>;
  request: () => Promise<ExpoPermissionResponse>;
} {
  if ("get" in entry && "request" in entry) {
    return entry;
  }
  return {
    get: () => entry.getPermissionsAsync(),
    request: () => entry.requestPermissionsAsync(),
  };
}

function mapExpoStatus(result: ExpoPermissionResponse): PermissionStatus {
  if (result.status === "granted") return "granted";
  if (result.status === "undetermined") return "denied";
  if (result.status === "denied") {
    return result.canAskAgain ? "denied" : "blocked";
  }
  return "unavailable";
}

// biome-ignore lint/suspicious/noExplicitAny: dynamic require returns unknown module shapes
function tryRequire(moduleName: string): any | null {
  try {
    return require(moduleName);
  } catch {
    return null;
  }
}

function discoverExpoModules(): Record<string, ExpoPermissionEntry> {
  const permissions: Record<string, ExpoPermissionEntry> = {};

  const camera = tryRequire("expo-camera");
  if (camera) {
    if (camera.getCameraPermissionsAsync) {
      permissions.camera = {
        get: () => camera.getCameraPermissionsAsync(),
        request: () => camera.requestCameraPermissionsAsync(),
      };
    }
    if (camera.getMicrophonePermissionsAsync) {
      permissions.microphone = {
        get: () => camera.getMicrophonePermissionsAsync(),
        request: () => camera.requestMicrophonePermissionsAsync(),
      };
    }
  }

  const location = tryRequire("expo-location");
  if (location) {
    if (location.getForegroundPermissionsAsync) {
      permissions.locationForeground = {
        get: () => location.getForegroundPermissionsAsync(),
        request: () => location.requestForegroundPermissionsAsync(),
      };
    }
    if (location.getBackgroundPermissionsAsync) {
      permissions.locationBackground = {
        get: () => location.getBackgroundPermissionsAsync(),
        request: () => location.requestBackgroundPermissionsAsync(),
      };
    }
  }

  const notifications = tryRequire("expo-notifications");
  if (notifications?.getPermissionsAsync) {
    permissions.notifications = notifications;
  }

  const contacts = tryRequire("expo-contacts");
  if (contacts?.getPermissionsAsync) {
    permissions.contacts = contacts;
  }

  const calendar = tryRequire("expo-calendar");
  if (calendar) {
    if (calendar.getCalendarPermissionsAsync) {
      permissions.calendar = {
        get: () => calendar.getCalendarPermissionsAsync(),
        request: () => calendar.requestCalendarPermissionsAsync(),
      };
    }
    if (calendar.getRemindersPermissionsAsync) {
      permissions.reminders = {
        get: () => calendar.getRemindersPermissionsAsync(),
        request: () => calendar.requestRemindersPermissionsAsync(),
      };
    }
  }

  const mediaLibrary = tryRequire("expo-media-library");
  if (mediaLibrary?.getPermissionsAsync) {
    permissions.mediaLibrary = mediaLibrary;
  }

  const imagePicker = tryRequire("expo-image-picker");
  if (imagePicker) {
    if (imagePicker.getCameraPermissionsAsync) {
      permissions.imagePickerCamera = {
        get: () => imagePicker.getCameraPermissionsAsync(),
        request: () => imagePicker.requestCameraPermissionsAsync(),
      };
    }
    if (imagePicker.getMediaLibraryPermissionsAsync) {
      permissions.imagePickerMediaLibrary = {
        get: () => imagePicker.getMediaLibraryPermissionsAsync(),
        request: () => imagePicker.requestMediaLibraryPermissionsAsync(),
      };
    }
  }

  const tracking = tryRequire("expo-tracking-transparency");
  if (tracking?.getTrackingPermissionsAsync) {
    permissions.tracking = {
      get: () => tracking.getTrackingPermissionsAsync(),
      request: () => tracking.requestTrackingPermissionsAsync(),
    };
  }

  const brightness = tryRequire("expo-brightness");
  if (brightness?.getPermissionsAsync) {
    permissions.brightness = brightness;
  }

  const audio = tryRequire("expo-audio");
  if (audio?.getRecordingPermissionsAsync) {
    permissions.audioRecording = {
      get: () => audio.getRecordingPermissionsAsync(),
      request: () => audio.requestRecordingPermissionsAsync(),
    };
  }

  const av = tryRequire("expo-av");
  if (av?.Audio?.getPermissionsAsync) {
    permissions.audio = av.Audio;
  }

  const screenCapture = tryRequire("expo-screen-capture");
  if (screenCapture?.getPermissionsAsync) {
    permissions.screenCapture = screenCapture;
  }

  const cellular = tryRequire("expo-cellular");
  if (cellular?.getPermissionsAsync) {
    permissions.cellular = cellular;
  }

  const sensors = tryRequire("expo-sensors");
  if (sensors) {
    if (sensors.Pedometer?.getPermissionsAsync) {
      permissions.pedometer = sensors.Pedometer;
    }
    if (sensors.Accelerometer?.getPermissionsAsync) {
      permissions.accelerometer = sensors.Accelerometer;
    }
  }

  return permissions;
}

let cachedDiscovery: Record<string, ExpoPermissionEntry> | null = null;

function getDiscoveredModules(): Record<string, ExpoPermissionEntry> {
  if (!cachedDiscovery) {
    cachedDiscovery = discoverExpoModules();
  }
  return cachedDiscovery;
}

/**
 * Create an Expo permission engine.
 *
 * With no arguments, auto-discovers installed Expo permission modules:
 *   createExpoEngine()
 *
 * With config, user permissions are merged on top of discovered defaults:
 *   createExpoEngine({ permissions: { camera: { get: ..., request: ... } } })
 */
export function createExpoEngine(config?: ExpoEngineConfig): PermissionEngine {
  const permissions = { ...getDiscoveredModules(), ...config?.permissions };

  return {
    async check(permission: string): Promise<PermissionStatus> {
      const entry = permissions[permission];
      if (!entry) return "unavailable";
      const { get } = resolveEntry(entry);
      return mapExpoStatus(await get());
    },

    async request(permission: string): Promise<PermissionStatus> {
      const entry = permissions[permission];
      if (!entry) return "unavailable";
      const { request } = resolveEntry(entry);
      return mapExpoStatus(await request());
    },

    async openSettings(permission?: string): Promise<void> {
      if (Platform.OS === "ios" && permission) {
        const url = iosSettingsUrl(permission);
        if (url) {
          try {
            await Linking.openURL(url);
            return;
          } catch {
            // Fall through to generic Settings.
          }
        }
      }
      await Linking.openSettings();
    },
  };
}
