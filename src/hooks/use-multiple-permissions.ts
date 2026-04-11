import { useCallback, useEffect, useRef, useState } from "react";
import { createDebugLogger } from "../core/debug-logger";
import { PermissionTimeoutError, withTimeout } from "../core/with-timeout";
import { resolveEngine } from "../engines/use-engine";
import type {
  MultiPermissionEntry,
  MultiplePermissionsConfig,
  MultiplePermissionsResult,
  PermissionEngine,
  PermissionFlowState,
  PermissionStatus,
} from "../types";

function permissionKey(entry: MultiPermissionEntry): string {
  return String(entry.permission);
}

function isGrantedStatus(status: PermissionStatus): boolean {
  return status === "granted" || status === "limited";
}

function statusToFlowState(status: PermissionStatus): PermissionFlowState {
  switch (status) {
    case "granted":
    case "limited":
      return "granted";
    case "blocked":
      return "blockedPrompt";
    case "unavailable":
      return "unavailable";
    case "denied":
      return "prePrompt";
    default:
      return "idle";
  }
}

export function useMultiplePermissions(
  config: MultiplePermissionsConfig,
): MultiplePermissionsResult {
  const engine = resolveEngine(config.engine);
  const {
    permissions,
    strategy,
    autoCheck = true,
    requestTimeout,
    onTimeout,
    debug,
    onAllGranted,
  } = config;
  const logger = createDebugLogger(debug, "multi");
  const [statuses, setStatuses] = useState<Record<string, PermissionFlowState>>(() => {
    const initial: Record<string, PermissionFlowState> = {};
    for (const entry of permissions) {
      initial[permissionKey(entry)] = "idle";
    }
    return initial;
  });
  const isRunning = useRef(false);
  const generation = useRef(0);

  const allGranted = permissions.every((entry) => statuses[permissionKey(entry)] === "granted");

  const requestAll = useCallback(async () => {
    if (isRunning.current) return;
    isRunning.current = true;
    const gen = generation.current;

    const update = (key: string, state: PermissionFlowState) => {
      setStatuses((prev) => {
        logger.transition(prev[key] ?? "idle", state, key);
        return { ...prev, [key]: state };
      });
    };

    try {
      if (strategy === "sequential") {
        await runSequential(permissions, engine, update, requestTimeout, onTimeout);
      } else {
        await runParallel(permissions, engine, update, requestTimeout, onTimeout);
      }

      if (generation.current !== gen) return;

      // Final check: are all granted?
      let allDone = true;
      for (const entry of permissions) {
        const finalStatus = await engine.check(entry.permission);
        if (!isGrantedStatus(finalStatus)) {
          allDone = false;
          break;
        }
      }
      if (allDone) {
        onAllGranted?.();
      }
    } finally {
      isRunning.current = false;
    }
  }, [permissions, strategy, engine, requestTimeout, onTimeout, logger, onAllGranted]);

  // Auto-check on mount
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only effect
  useEffect(() => {
    if (!autoCheck) return;

    let cancelled = false;
    async function checkAll() {
      for (const entry of permissions) {
        const key = permissionKey(entry);
        const status = await engine.check(entry.permission);
        if (cancelled) return;
        setStatuses((prev) => ({ ...prev, [key]: statusToFlowState(status) }));
      }
    }
    checkAll();
    return () => {
      cancelled = true;
    };
  }, []);

  const resetAll = useCallback(() => {
    generation.current += 1;
    isRunning.current = false;
    const initial: Record<string, PermissionFlowState> = {};
    for (const entry of permissions) {
      initial[permissionKey(entry)] = "idle";
    }
    setStatuses(initial);
    logger.info("reset all to idle");
  }, [permissions, logger]);

  return {
    statuses,
    allGranted,
    request: requestAll,
    reset: resetAll,
  };
}

async function runSequential(
  permissions: MultiPermissionEntry[],
  engine: PermissionEngine,
  updateStatus: (key: string, state: PermissionFlowState) => void,
  requestTimeout?: number,
  onTimeout?: () => void,
): Promise<void> {
  for (const entry of permissions) {
    const key = permissionKey(entry);

    updateStatus(key, "checking");
    const checkStatus = await engine.check(entry.permission);

    if (isGrantedStatus(checkStatus)) {
      updateStatus(key, "granted");
      entry.onGrant?.();
      continue;
    }

    if (checkStatus === "unavailable") {
      updateStatus(key, "unavailable");
      continue;
    }

    if (checkStatus === "blocked") {
      updateStatus(key, "blockedPrompt");
      entry.onBlock?.();
      break;
    }

    // Denied — request it
    updateStatus(key, "requesting");
    try {
      const requestPromise = engine.request(entry.permission);
      const requestStatus = requestTimeout
        ? await withTimeout(requestPromise, requestTimeout, entry.permission)
        : await requestPromise;

      if (isGrantedStatus(requestStatus)) {
        updateStatus(key, "granted");
        entry.onGrant?.();
      } else if (requestStatus === "blocked") {
        updateStatus(key, "blockedPrompt");
        entry.onBlock?.();
        break;
      } else {
        updateStatus(key, "denied");
        entry.onDeny?.();
        break;
      }
    } catch (err) {
      if (err instanceof PermissionTimeoutError) {
        onTimeout?.();
        updateStatus(key, "blockedPrompt");
        break;
      }
      throw err;
    }
  }
}

async function runParallel(
  permissions: MultiPermissionEntry[],
  engine: PermissionEngine,
  updateStatus: (key: string, state: PermissionFlowState) => void,
  requestTimeout?: number,
  onTimeout?: () => void,
): Promise<void> {
  // Check all in parallel
  const checkResults = await Promise.all(
    permissions.map(async (entry) => {
      const key = permissionKey(entry);
      updateStatus(key, "checking");
      const status = await engine.check(entry.permission);
      return { entry, key, status };
    }),
  );

  // Update granted/unavailable immediately
  for (const { entry, key, status } of checkResults) {
    if (isGrantedStatus(status)) {
      updateStatus(key, "granted");
      entry.onGrant?.();
    } else if (status === "unavailable") {
      updateStatus(key, "unavailable");
    }
  }

  // Request denied/blocked ones sequentially (system dialogs are sequential)
  const needsAction = checkResults.filter(
    ({ status }) => status === "denied" || status === "blocked",
  );

  for (const { entry, key, status } of needsAction) {
    if (status === "blocked") {
      updateStatus(key, "blockedPrompt");
      entry.onBlock?.();
      continue;
    }

    updateStatus(key, "requesting");
    try {
      const requestPromise = engine.request(entry.permission);
      const requestStatus = requestTimeout
        ? await withTimeout(requestPromise, requestTimeout, entry.permission)
        : await requestPromise;

      if (isGrantedStatus(requestStatus)) {
        updateStatus(key, "granted");
        entry.onGrant?.();
      } else if (requestStatus === "blocked") {
        updateStatus(key, "blockedPrompt");
        entry.onBlock?.();
      } else {
        updateStatus(key, "denied");
        entry.onDeny?.();
      }
    } catch (err) {
      if (err instanceof PermissionTimeoutError) {
        onTimeout?.();
        updateStatus(key, "blockedPrompt");
      } else {
        throw err;
      }
    }
  }
}
