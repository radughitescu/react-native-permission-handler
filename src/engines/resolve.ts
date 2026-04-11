import type { PermissionEngine } from "../types";

let defaultEngine: PermissionEngine | null = null;

export function setDefaultEngine(engine: PermissionEngine): void {
  defaultEngine = engine;
}

export function getDefaultEngine(): PermissionEngine | null {
  return defaultEngine;
}
