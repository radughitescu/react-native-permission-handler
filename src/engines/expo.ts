import { Linking } from "react-native";
import type { PermissionEngine, PermissionStatus } from "../types";

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
  permissions: Record<string, ExpoPermissionEntry>;
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

export function createExpoEngine(config: ExpoEngineConfig): PermissionEngine {
  return {
    async check(permission: string): Promise<PermissionStatus> {
      const entry = config.permissions[permission];
      if (!entry) return "unavailable";
      const { get } = resolveEntry(entry);
      return mapExpoStatus(await get());
    },

    async request(permission: string): Promise<PermissionStatus> {
      const entry = config.permissions[permission];
      if (!entry) return "unavailable";
      const { request } = resolveEntry(entry);
      return mapExpoStatus(await request());
    },

    async openSettings(): Promise<void> {
      await Linking.openSettings();
    },
  };
}
