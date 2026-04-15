import type { PermissionEngine, PermissionStatus } from "../types";

export function createNoopEngine(defaultStatus: PermissionStatus = "granted"): PermissionEngine {
  return {
    async check(): Promise<PermissionStatus> {
      return defaultStatus;
    },
    async request(): Promise<PermissionStatus> {
      return defaultStatus;
    },
    async openSettings(_permission?: string): Promise<void> {},
  };
}
