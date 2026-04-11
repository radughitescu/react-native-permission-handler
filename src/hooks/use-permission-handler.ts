import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
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
    requestTimeout,
    onTimeout,
    debug,
    onGrant,
    onDeny,
    onBlock,
    onSettingsReturn,
  } = config;

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
        if (next === "granted" && s !== "granted") onGrant?.();
        return next;
      });
    } catch {
      if (generation.current !== gen) return;
      setFlowState("idle");
    }
  }, [engine, permission, logger, onGrant]);

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
        if (next === "granted") onGrant?.();
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
        if (next === "granted") onGrant?.();
        onSettingsReturn?.(next === "granted");
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
    isGranted: flowState === "granted",
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
  };
}
