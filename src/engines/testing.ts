import type { PermissionEngine, PermissionStatus } from "../types";

export interface TestingEngine extends PermissionEngine {
  setStatus(permission: string, status: PermissionStatus): void;
  getRequestHistory(): Array<{ permission: string; method: "check" | "request" }>;
  reset(): void;
}

export interface TestingEngineOptions {
  /**
   * When true, `request()` returns `"granted"` for permissions that have
   * not been explicitly seeded via `initialStatuses` or `setStatus`. Useful
   * for happy-path tests that want to avoid setting up every permission.
   *
   * When false (default), both `check()` and `request()` return `"denied"`
   * for unseeded permissions — symmetric and predictable. This avoids the
   * subtle asymmetry where a test forgets to seed a permission and sees a
   * flow that denies on mount but magically grants on request.
   *
   * Default: `false`.
   */
  autoGrantUnset?: boolean;
}

export function createTestingEngine(
  initialStatuses?: Record<string, PermissionStatus>,
  options: TestingEngineOptions = {},
): TestingEngine {
  const { autoGrantUnset = false } = options;
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
      return statuses[permission] ?? (autoGrantUnset ? "granted" : "denied");
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
