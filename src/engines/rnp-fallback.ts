import type { PermissionEngine } from "../types";

let cachedFallback: PermissionEngine | null = null;

export function getRNPFallbackEngine(): PermissionEngine {
  if (cachedFallback) return cachedFallback;

  try {
    // Dynamic require to avoid hard dependency — only resolves if
    // react-native-permissions is installed by the consumer.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("./rnp") as { createRNPEngine: () => PermissionEngine };
    const { createRNPEngine } = mod;
    cachedFallback = createRNPEngine();
    return cachedFallback;
  } catch {
    throw new Error(
      "react-native-permission-handler: No permission engine configured. " +
        "Either pass an `engine` in your hook config, call setDefaultEngine(), " +
        "or install react-native-permissions as a peer dependency.",
    );
  }
}
