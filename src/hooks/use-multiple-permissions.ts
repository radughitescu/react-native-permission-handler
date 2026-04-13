import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { getDefaultRequestTimeout } from "../core/android-defaults";
import { createDebugLogger } from "../core/debug-logger";
import { PermissionTimeoutError, withTimeout } from "../core/with-timeout";
import { resolveEngine } from "../engines/use-engine";
import type {
  MultiPermissionEntry,
  MultiPermissionHandler,
  MultiplePermissionsConfig,
  MultiplePermissionsResult,
  PermissionFlowState,
  PermissionStatus,
} from "../types";

function permissionKey(entry: MultiPermissionEntry): string {
  return entry.id ?? String(entry.permission);
}

function isGrantedStatus(status: PermissionStatus): boolean {
  return status === "granted" || status === "limited";
}

function statusToFlowState(status: PermissionStatus): PermissionFlowState {
  if (status === "granted") return "granted";
  if (status === "limited") return "limited";
  if (status === "blocked") return "blockedPrompt";
  if (status === "unavailable") return "unavailable";
  return "prePrompt";
}

export function useMultiplePermissions(
  config: MultiplePermissionsConfig,
): MultiplePermissionsResult {
  const engine = resolveEngine(config.engine);
  const { permissions, strategy, autoCheck = true, onTimeout, debug, onAllGranted } = config;
  const requestTimeout = getDefaultRequestTimeout(config.requestTimeout);
  const logger = createDebugLogger(debug, "multi");

  // Dev-only: warn when entry keys collide (duplicate `id` or duplicate permission strings
  // without distinguishing `id`s). Duplicates cause statuses/handlers to clobber each other.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const keys = permissions.map(permissionKey);
    const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
    if (dupes.length > 0) {
      console.warn(
        `[react-native-permission-handler] useMultiplePermissions: duplicate entry keys detected: ${[
          ...new Set(dupes),
        ].join(", ")}. Statuses for duplicates will clobber each other. Add unique 'id' fields.`,
      );
    }
  }, [permissions]);

  const [statuses, setStatuses] = useState<Record<string, PermissionFlowState>>(() => {
    const initial: Record<string, PermissionFlowState> = {};
    for (const entry of permissions) {
      initial[permissionKey(entry)] = "idle";
    }
    return initial;
  });

  const [activePermission, setActivePermission] = useState<string | null>(null);
  const isRunning = useRef(false);
  const generation = useRef(0);
  const waitingForSettings = useRef<string | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const pendingQueue = useRef<string[]>([]);
  // Ref mirror of statuses for use in callbacks without stale closures
  const statusesRef = useRef(statuses);
  statusesRef.current = statuses;

  const allGranted = permissions.every((entry) => {
    const s = statuses[permissionKey(entry)];
    return s === "granted" || s === "limited";
  });

  const blockedPermissions = useMemo(
    () =>
      permissions.map(permissionKey).filter((key) => {
        const s = statuses[key];
        return s === "blockedPrompt" || s === "openingSettings" || s === "blocked";
      }),
    [permissions, statuses],
  );

  const updateStatus = useCallback(
    (key: string, state: PermissionFlowState) => {
      setStatuses((prev) => {
        logger.transition(prev[key] ?? "idle", state, key);
        return { ...prev, [key]: state };
      });
      statusesRef.current = { ...statusesRef.current, [key]: state };
    },
    [logger],
  );

  const findEntry = useCallback(
    (key: string): MultiPermissionEntry | undefined =>
      permissions.find((e) => permissionKey(e) === key),
    [permissions],
  );

  // Check if all permissions are granted using the ref (avoids stale closures)
  const checkAllGrantedAndNotify = useCallback(() => {
    const all = permissions.every((entry) => {
      const s = statusesRef.current[permissionKey(entry)];
      return s === "granted" || s === "limited";
    });
    if (all) {
      isRunning.current = false;
      onAllGranted?.();
    }
  }, [permissions, onAllGranted]);

  // Advance to the next pending permission in the queue, or finish
  const advanceToNext = useCallback(() => {
    if (pendingQueue.current.length > 0) {
      setActivePermission(pendingQueue.current[0]);
    } else {
      setActivePermission(null);
      isRunning.current = false;
      checkAllGrantedAndNotify();
    }
  }, [checkAllGrantedAndNotify]);

  // Check all permissions and build the pending queue
  const requestAll = useCallback(async () => {
    if (isRunning.current) return;
    isRunning.current = true;
    const gen = generation.current;

    let checkResults: Array<{ entry: MultiPermissionEntry; key: string; status: PermissionStatus }>;

    if (strategy === "parallel") {
      checkResults = await Promise.all(
        permissions.map(async (entry) => {
          const key = permissionKey(entry);
          updateStatus(key, "checking");
          const status = await engine.check(entry.permission);
          return { entry, key, status };
        }),
      );
    } else {
      checkResults = [];
      for (const entry of permissions) {
        const key = permissionKey(entry);
        updateStatus(key, "checking");
        const status = await engine.check(entry.permission);
        if (generation.current !== gen) return;
        checkResults.push({ entry, key, status });
      }
    }

    if (generation.current !== gen) return;

    const pending: string[] = [];
    for (const { entry, key, status } of checkResults) {
      const flowState = statusToFlowState(status);
      updateStatus(key, flowState);
      if (isGrantedStatus(status)) {
        entry.onGrant?.();
      } else if (status === "blocked") {
        entry.onBlock?.();
        pending.push(key);
      } else if (status !== "unavailable") {
        pending.push(key);
      }
    }

    pendingQueue.current = pending;

    if (pending.length > 0) {
      setActivePermission(pending[0]);
    } else {
      setActivePermission(null);
      isRunning.current = false;
      onAllGranted?.();
    }
  }, [permissions, strategy, engine, updateStatus, onAllGranted]);

  // Per-permission action: confirm pre-prompt -> request
  const handleRequest = useCallback(
    async (key: string) => {
      const entry = findEntry(key);
      if (!entry) return;
      const gen = generation.current;

      updateStatus(key, "requesting");
      try {
        const requestPromise = engine.request(entry.permission);
        const status = requestTimeout
          ? await withTimeout(requestPromise, requestTimeout, entry.permission)
          : await requestPromise;

        if (generation.current !== gen) return;

        if (isGrantedStatus(status)) {
          updateStatus(key, "granted");
          entry.onGrant?.();
        } else if (status === "blocked") {
          updateStatus(key, "blockedPrompt");
          entry.onBlock?.();
        } else {
          updateStatus(key, "denied");
          entry.onDeny?.();
        }
      } catch (err) {
        if (generation.current !== gen) return;
        if (err instanceof PermissionTimeoutError) {
          onTimeout?.();
          updateStatus(key, "blockedPrompt");
        } else {
          updateStatus(key, "denied");
        }
      }

      // Remove from queue
      pendingQueue.current = pendingQueue.current.filter((k) => k !== key);

      // In sequential mode, stop on deny/block
      const latestStatus = statusesRef.current[key];
      if (strategy === "sequential" && latestStatus !== "granted") {
        pendingQueue.current = [];
        setActivePermission(null);
        isRunning.current = false;
        return;
      }

      advanceToNext();
    },
    [engine, findEntry, updateStatus, requestTimeout, onTimeout, strategy, advanceToNext],
  );

  // Per-permission action: dismiss pre-prompt
  const handleDismiss = useCallback(
    (key: string) => {
      const entry = findEntry(key);
      updateStatus(key, "denied");
      entry?.onDeny?.();

      pendingQueue.current = pendingQueue.current.filter((k) => k !== key);

      if (strategy === "sequential") {
        pendingQueue.current = [];
        setActivePermission(null);
        isRunning.current = false;
      } else {
        advanceToNext();
      }
    },
    [findEntry, updateStatus, strategy, advanceToNext],
  );

  // Per-permission action: dismiss blocked prompt
  const handleDismissBlocked = useCallback(
    (key: string) => {
      const entry = findEntry(key);
      updateStatus(key, "denied");
      entry?.onDeny?.();

      pendingQueue.current = pendingQueue.current.filter((k) => k !== key);
      advanceToNext();
    },
    [findEntry, updateStatus, advanceToNext],
  );

  // Per-permission action: open settings
  const handleOpenSettings = useCallback(
    async (key: string) => {
      updateStatus(key, "openingSettings");
      waitingForSettings.current = key;
      try {
        await engine.openSettings();
      } catch {
        waitingForSettings.current = null;
        updateStatus(key, "blockedPrompt");
      }
    },
    [engine, updateStatus],
  );

  // Recheck a specific permission after returning from settings
  const recheckAfterSettings = useCallback(
    async (key: string) => {
      const entry = findEntry(key);
      if (!entry) return;
      const gen = generation.current;

      updateStatus(key, "recheckingAfterSettings");
      try {
        const status = await engine.check(entry.permission);
        if (generation.current !== gen) return;

        if (isGrantedStatus(status)) {
          updateStatus(key, "granted");
          entry.onGrant?.();
          entry.onSettingsReturn?.(true);

          pendingQueue.current = pendingQueue.current.filter((k) => k !== key);
          advanceToNext();
        } else {
          updateStatus(key, "blockedPrompt");
          entry.onSettingsReturn?.(false);
        }
      } catch {
        if (generation.current !== gen) return;
        updateStatus(key, "blockedPrompt");
      }
    },
    [engine, findEntry, updateStatus, advanceToNext],
  );

  // AppState listener for settings return
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active" &&
        waitingForSettings.current
      ) {
        const key = waitingForSettings.current;
        waitingForSettings.current = null;
        recheckAfterSettings(key);
      }
      appStateRef.current = nextAppState;
    });
    return () => subscription.remove();
  }, [recheckAfterSettings]);

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

  const resume = useCallback(() => {
    if (strategy !== "sequential") return;
    const current = statusesRef.current;
    const pending = permissions.map(permissionKey).filter((key) => {
      const s = current[key];
      return s !== "granted" && s !== "limited";
    });
    if (pending.length === 0) return;
    pendingQueue.current = pending;
    isRunning.current = true;
    setActivePermission(pending[0] ?? null);
    logger.info(`resume: restarting sequential flow at ${pending[0]}`);
  }, [permissions, strategy, logger]);

  const resetAll = useCallback(() => {
    generation.current += 1;
    isRunning.current = false;
    pendingQueue.current = [];
    waitingForSettings.current = null;
    setActivePermission(null);
    const initial: Record<string, PermissionFlowState> = {};
    for (const entry of permissions) {
      initial[permissionKey(entry)] = "idle";
    }
    setStatuses(initial);
    logger.info("reset all to idle");
  }, [permissions, logger]);

  // Build per-permission handlers
  const handlers = useMemo(() => {
    const result: Record<string, MultiPermissionHandler> = {};
    for (const entry of permissions) {
      const key = permissionKey(entry);
      result[key] = {
        get state() {
          return statuses[key] ?? "idle";
        },
        request: () => handleRequest(key),
        dismiss: () => handleDismiss(key),
        dismissBlocked: () => handleDismissBlocked(key),
        openSettings: () => handleOpenSettings(key),
      };
    }
    return result;
  }, [
    permissions,
    statuses,
    handleRequest,
    handleDismiss,
    handleDismissBlocked,
    handleOpenSettings,
  ]);

  return {
    statuses,
    allGranted,
    handlers,
    activePermission,
    blockedPermissions,
    request: requestAll,
    reset: resetAll,
    resume,
  };
}
