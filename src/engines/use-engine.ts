import type { PermissionEngine } from "../types";
import { getDefaultEngine } from "./resolve";
import { getRNPFallbackEngine } from "./rnp-fallback";

export function resolveEngine(configEngine?: PermissionEngine): PermissionEngine {
  if (configEngine) return configEngine;
  const global = getDefaultEngine();
  if (global) return global;
  return getRNPFallbackEngine();
}
