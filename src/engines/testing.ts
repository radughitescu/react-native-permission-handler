import type { PermissionEngine, PermissionStatus } from "../types";

export interface TestingEngine extends PermissionEngine {
  setStatus(permission: string, status: PermissionStatus): void;
  getRequestHistory(): Array<{ permission: string; method: "check" | "request" }>;
  reset(): void;
}

export function createTestingEngine(
  initialStatuses?: Record<string, PermissionStatus>,
): TestingEngine {
  const initial = { ...initialStatuses };
  let statuses: Record<string, PermissionStatus> = { ...initial };
  let history: Array<{ permission: string; method: "check" | "request" }> = [];

  return {
    async check(permission: string): Promise<PermissionStatus> {
      history.push({ permission, method: "check" });
      return statuses[permission] ?? "denied";
    },

    async request(permission: string): Promise<PermissionStatus> {
      history.push({ permission, method: "request" });
      return statuses[permission] ?? "granted";
    },

    async openSettings(): Promise<void> {},

    setStatus(permission: string, status: PermissionStatus): void {
      statuses[permission] = status;
    },

    getRequestHistory() {
      return [...history];
    },

    reset(): void {
      statuses = { ...initial };
      history = [];
    },
  };
}
