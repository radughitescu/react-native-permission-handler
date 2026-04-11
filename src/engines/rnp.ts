import {
  type Permission,
  check,
  checkNotifications,
  openSettings,
  request,
  requestNotifications,
} from "react-native-permissions";
import type { PermissionEngine, PermissionStatus } from "../types";

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
