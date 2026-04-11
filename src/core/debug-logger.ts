const PREFIX = "[permission-handler]";

interface DebugLogger {
  transition(from: string, to: string, event?: string): void;
  info(msg: string): void;
}

const NOOP_LOGGER: DebugLogger = {
  transition: () => {},
  info: () => {},
};

export function createDebugLogger(
  debug: boolean | ((msg: string) => void) | undefined,
  permission: string,
): DebugLogger {
  if (!debug) return NOOP_LOGGER;

  const log = typeof debug === "function" ? debug : (msg: string) => console.log(msg);

  return {
    transition(from: string, to: string, event?: string) {
      log(`${PREFIX} ${permission}: ${from} → ${to}${event ? ` (${event})` : ""}`);
    },
    info(msg: string) {
      log(`${PREFIX} ${permission}: ${msg}`);
    },
  };
}
