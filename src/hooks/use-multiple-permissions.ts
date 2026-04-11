import { useCallback, useEffect, useRef, useState } from "react";
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
  const { permissions, strategy, autoCheck = true, onAllGranted } = config;
  const [statuses, setStatuses] = useState<Record<string, PermissionFlowState>>(() => {
    const initial: Record<string, PermissionFlowState> = {};
    for (const entry of permissions) {
      initial[permissionKey(entry)] = "idle";
    }
    return initial;
  });
  const isRunning = useRef(false);

  const allGranted = permissions.every((entry) => statuses[permissionKey(entry)] === "granted");

  const requestAll = useCallback(async () => {
    if (isRunning.current) return;
    isRunning.current = true;

    const update = (key: string, state: PermissionFlowState) => {
      setStatuses((prev) => ({ ...prev, [key]: state }));
    };

    try {
      if (strategy === "sequential") {
        await runSequential(permissions, engine, update);
      } else {
        await runParallel(permissions, engine, update);
      }

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
  }, [permissions, strategy, engine, onAllGranted]);

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

  return {
    statuses,
    allGranted,
    request: requestAll,
  };
}

async function runSequential(
  permissions: MultiPermissionEntry[],
  engine: PermissionEngine,
  updateStatus: (key: string, state: PermissionFlowState) => void,
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
    const requestStatus = await engine.request(entry.permission);

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
  }
}

async function runParallel(
  permissions: MultiPermissionEntry[],
  engine: PermissionEngine,
  updateStatus: (key: string, state: PermissionFlowState) => void,
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
    const requestStatus = await engine.request(entry.permission);

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
  }
}
