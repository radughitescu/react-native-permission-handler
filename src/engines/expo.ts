import { Linking } from "react-native";
import type { PermissionEngine, PermissionStatus } from "../types";

export interface ExpoPermissionModule {
  getPermissionsAsync: () => Promise<{ status: string; canAskAgain: boolean }>;
  requestPermissionsAsync: () => Promise<{ status: string; canAskAgain: boolean }>;
}

export interface ExpoEngineConfig {
  permissions: Record<string, ExpoPermissionModule>;
}

function mapExpoStatus(result: {
  status: string;
  canAskAgain: boolean;
}): PermissionStatus {
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
      const mod = config.permissions[permission];
      if (!mod) return "unavailable";
      const result = await mod.getPermissionsAsync();
      return mapExpoStatus(result);
    },

    async request(permission: string): Promise<PermissionStatus> {
      const mod = config.permissions[permission];
      if (!mod) return "unavailable";
      const result = await mod.requestPermissionsAsync();
      return mapExpoStatus(result);
    },

    async openSettings(): Promise<void> {
      await Linking.openSettings();
    },
  };
}
