import { useCallback, useRef, useState } from "react";
import {
  type PermissionStatus,
  check,
  checkNotifications,
  request,
  requestNotifications,
} from "react-native-permissions";
import type {
  MultiPermissionEntry,
  MultiplePermissionsConfig,
  MultiplePermissionsResult,
  PermissionFlowState,
} from "../types";

function isNotifications(
  permission: MultiPermissionEntry["permission"],
): permission is "notifications" {
  return permission === "notifications";
}

async function checkOne(entry: MultiPermissionEntry): Promise<PermissionStatus> {
  if (isNotifications(entry.permission)) {
    const result = await checkNotifications();
    return result.status;
  }
  return check(entry.permission);
}

async function requestOne(entry: MultiPermissionEntry): Promise<PermissionStatus> {
  if (isNotifications(entry.permission)) {
    const result = await requestNotifications(["alert", "badge", "sound"]);
    return result.status;
  }
  return request(entry.permission);
}

function permissionKey(entry: MultiPermissionEntry): string {
  return String(entry.permission);
}

function isGrantedStatus(status: PermissionStatus): boolean {
  return status === "granted" || status === "limited";
}

export function useMultiplePermissions(
  config: MultiplePermissionsConfig,
): MultiplePermissionsResult {
  const { permissions, strategy, onAllGranted } = config;
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
        await runSequential(permissions, update);
      } else {
        await runParallel(permissions, update);
      }

      // Final check: are all granted?
      let allDone = true;
      for (const entry of permissions) {
        const finalStatus = await checkOne(entry);
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
  }, [permissions, strategy, onAllGranted]);

  return {
    statuses,
    allGranted,
    request: requestAll,
  };
}

async function runSequential(
  permissions: MultiPermissionEntry[],
  updateStatus: (key: string, state: PermissionFlowState) => void,
): Promise<void> {
  for (const entry of permissions) {
    const key = permissionKey(entry);

    updateStatus(key, "checking");
    const checkStatus = await checkOne(entry);

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
    const requestStatus = await requestOne(entry);

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
  updateStatus: (key: string, state: PermissionFlowState) => void,
): Promise<void> {
  // Check all in parallel
  const checkResults = await Promise.all(
    permissions.map(async (entry) => {
      const key = permissionKey(entry);
      updateStatus(key, "checking");
      const status = await checkOne(entry);
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
    const requestStatus = await requestOne(entry);

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
