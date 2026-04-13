import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { getDefaultRequestTimeout } from "../core/android-defaults";
import { createDebugLogger } from "../core/debug-logger";
import { transition } from "../core/state-machine";
import { PermissionTimeoutError, withTimeout } from "../core/with-timeout";
import { resolveEngine } from "../engines/use-engine";
import type {
  PermissionFlowState,
  PermissionHandlerConfig,
  PermissionHandlerResult,
  PermissionStatus,
} from "../types";

/**
 * Pure helper: should the pre-prompt be skipped on denied status given
 * the configured value and current OS?
 */
export function shouldSkipPrePrompt(value: boolean | "android" | undefined, os: string): boolean {
  if (value === true) return true;
  if (value === "android" && os === "android") return true;
  return false;
}

export function usePermissionHandler(config: PermissionHandlerConfig): PermissionHandlerResult {
  const engine = resolveEngine(config.engine);
  const [flowState, setFlowState] = useState<PermissionFlowState>("idle");
  const [nativeStatus, setNativeStatus] = useState<PermissionStatus | null>(null);
  const isRequesting = useRef(false);
  const waitingForSettings = useRef(false);
  const generation = useRef(0);
  const appStateRef = useRef(AppState.currentState);

  const {
    permission,
    autoCheck = true,
    onTimeout,
    debug,
    onGrant,
    onDeny,
    onBlock,
    onSettingsReturn,
    skipPrePrompt,
  } = config;
  const requestTimeout = getDefaultRequestTimeout(config.requestTimeout);

  const skipPrePromptResolved = shouldSkipPrePrompt(skipPrePrompt, Platform.OS);
  const requestPermissionRef = useRef<() => Promise<void>>(async () => {});

  const logger = createDebugLogger(debug, permission);

  const checkPermission = useCallback(async () => {
    const gen = generation.current;
    setFlowState((s) => {
      const next = transition(s, { type: "CHECK" });
      logger.transition(s, next, "CHECK");
      return next;
    });
    try {
      const status = await engine.check(permission);
      if (generation.current !== gen) return;
      setNativeStatus(status);
      setFlowState((s) => {
        const next = transition(s, { type: "CHECK_RESULT", status });
        logger.transition(s, next, `CHECK_RESULT:${status}`);
        if ((next === "granted" || next === "limited") && s !== "granted" && s !== "limited")
          onGrant?.();
        return next;
      });
      if (status === "denied" && skipPrePromptResolved) {
        logger.info("skipPrePrompt: bypassing prePrompt, requesting immediately");
        await requestPermissionRef.current();
      }
    } catch {
      if (generation.current !== gen) return;
      setFlowState("idle");
    }
  }, [engine, permission, logger, onGrant, skipPrePromptResolved]);

  const requestPermission = useCallback(async () => {
    if (isRequesting.current) return;
    isRequesting.current = true;
    const gen = generation.current;

    setFlowState((s) => {
      const next = transition(s, { type: "PRE_PROMPT_CONFIRM" });
      logger.transition(s, next, "PRE_PROMPT_CONFIRM");
      return next;
    });
    try {
      const requestPromise = engine.request(permission);
      const status = requestTimeout
        ? await withTimeout(requestPromise, requestTimeout, permission)
        : await requestPromise;
      if (generation.current !== gen) return;
      setNativeStatus(status);
      setFlowState((s) => {
        const next = transition(s, { type: "REQUEST_RESULT", status });
        logger.transition(s, next, `REQUEST_RESULT:${status}`);
        if (next === "granted" || next === "limited") onGrant?.();
        if (next === "denied") onDeny?.();
        if (next === "blockedPrompt") onBlock?.();
        return next;
      });
    } catch (err) {
      if (generation.current !== gen) return;
      if (err instanceof PermissionTimeoutError) {
        logger.info(`request timed out after ${requestTimeout}ms`);
        onTimeout?.();
        setFlowState("blockedPrompt");
      } else {
        setFlowState("denied");
      }
    } finally {
      isRequesting.current = false;
    }
  }, [engine, permission, requestTimeout, onTimeout, logger, onGrant, onDeny, onBlock]);

  requestPermissionRef.current = requestPermission;

  const dismiss = useCallback(() => {
    setFlowState((s) => {
      const next = transition(s, { type: "PRE_PROMPT_DISMISS" });
      logger.transition(s, next, "PRE_PROMPT_DISMISS");
      return next;
    });
    onDeny?.();
  }, [logger, onDeny]);

  const goToSettings = useCallback(async () => {
    setFlowState((s) => {
      const next = transition(s, { type: "OPEN_SETTINGS" });
      logger.transition(s, next, "OPEN_SETTINGS");
      return next;
    });
    waitingForSettings.current = true;
    try {
      await engine.openSettings();
    } catch {
      waitingForSettings.current = false;
      setFlowState("blockedPrompt");
    }
  }, [engine, logger]);

  const dismissBlocked = useCallback(() => {
    setFlowState((s) => {
      const next = transition(s, { type: "BLOCKED_PROMPT_DISMISS" });
      logger.transition(s, next, "BLOCKED_PROMPT_DISMISS");
      return next;
    });
    onDeny?.();
  }, [logger, onDeny]);

  const reset = useCallback(() => {
    generation.current += 1;
    setFlowState("idle");
    setNativeStatus(null);
    waitingForSettings.current = false;
    isRequesting.current = false;
    logger.info("reset to idle");
  }, [logger]);

  const requestFullAccess = useCallback(async (): Promise<PermissionStatus> => {
    if (!engine.requestFullAccess) {
      throw new Error(
        "[react-native-permission-handler] The current engine does not implement requestFullAccess(). Switch to an engine that supports it (e.g., the Expo engine's presentPermissionsPickerAsync) or provide a custom engine.",
      );
    }
    const gen = generation.current;
    const status = await engine.requestFullAccess(permission);
    if (generation.current !== gen) return status;
    setFlowState((s) => {
      const next = transition(s, { type: "CHECK" });
      logger.transition(s, next, "CHECK");
      return next;
    });
    const recheck = await engine.check(permission);
    if (generation.current !== gen) return status;
    setNativeStatus(recheck);
    setFlowState((s) => {
      const next = transition(s, { type: "CHECK_RESULT", status: recheck });
      logger.transition(s, next, `CHECK_RESULT:${recheck}`);
      if ((next === "granted" || next === "limited") && s !== "granted" && s !== "limited")
        onGrant?.();
      return next;
    });
    return status;
  }, [engine, permission, logger, onGrant]);

  const recheckAfterSettings = useCallback(async () => {
    const gen = generation.current;
    setFlowState((s) => {
      const next = transition(s, { type: "SETTINGS_RETURN" });
      logger.transition(s, next, "SETTINGS_RETURN");
      return next;
    });
    try {
      const status = await engine.check(permission);
      if (generation.current !== gen) return;
      setNativeStatus(status);
      setFlowState((s) => {
        const next = transition(s, { type: "RECHECK_RESULT", status });
        logger.transition(s, next, `RECHECK_RESULT:${status}`);
        if (next === "granted" || next === "limited") onGrant?.();
        onSettingsReturn?.(next === "granted" || next === "limited");
        return next;
      });
    } catch {
      if (generation.current !== gen) return;
      setFlowState("blockedPrompt");
    }
  }, [engine, permission, logger, onGrant, onSettingsReturn]);

  // Auto-check on mount
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only effect
  useEffect(() => {
    if (autoCheck) {
      checkPermission();
    }
  }, []);

  // AppState listener for settings return
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active" &&
        waitingForSettings.current
      ) {
        waitingForSettings.current = false;
        recheckAfterSettings();
      }
      appStateRef.current = nextAppState;
    });
    return () => subscription.remove();
  }, [recheckAfterSettings]);

  return {
    state: flowState,
    nativeStatus,
    isGranted: flowState === "granted" || flowState === "limited",
    isLimited: flowState === "limited",
    isDenied: flowState === "denied",
    isBlocked:
      flowState === "blocked" || flowState === "blockedPrompt" || flowState === "openingSettings",
    isChecking: flowState === "checking" || flowState === "recheckingAfterSettings",
    isUnavailable: flowState === "unavailable",
    request: requestPermission,
    check: checkPermission,
    dismiss,
    dismissBlocked,
    openSettings: goToSettings,
    reset,
    requestFullAccess,
  };
}
