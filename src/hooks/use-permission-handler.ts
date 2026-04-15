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
  PermissionMetadata,
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
  // Mirror of flowState for synchronous reads inside callbacks. Updating on
  // every render keeps it in lockstep without re-creating callbacks on every
  // state change.
  const flowStateRef = useRef(flowState);
  flowStateRef.current = flowState;

  const {
    permission,
    autoCheck = true,
    recheckOnForeground = false,
    onTimeout,
    debug,
    onGrant,
    onDeny,
    onBlock,
    onSettingsReturn,
    skipPrePrompt,
    renderPrePrompt,
    renderBlockedPrompt,
    prePrompt,
    blockedPrompt,
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
      await engine.openSettings(permission);
    } catch {
      waitingForSettings.current = false;
      setFlowState("blockedPrompt");
    }
  }, [engine, logger, permission]);

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
        "[react-native-permission-handler] The current engine does not implement requestFullAccess(). " +
          "The RNP engine cannot yet call iOS `presentLimitedLibraryPicker` because " +
          "react-native-permissions does not expose a JS binding for it (tracked as future work). " +
          "Use the Expo engine (which supports MediaLibrary.presentPermissionsPickerAsync) or provide a custom engine with a native shim.",
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

  const refresh = useCallback(async (): Promise<PermissionStatus> => {
    if (isRequesting.current) {
      return nativeStatus ?? "denied";
    }
    const gen = generation.current;

    // Read current state via ref to avoid the strict-mode double-invoke
    // hazard of capturing from inside a setFlowState updater.
    const currentState = flowStateRef.current;
    const next = transition(currentState, { type: "REFRESH" });
    if (next !== "requesting" || currentState === "requesting") {
      logger.info("refresh: no-op from current state");
      return nativeStatus ?? "denied";
    }

    logger.transition(currentState, next, "REFRESH");
    setFlowState(next);
    isRequesting.current = true;
    try {
      const requestPromise = engine.request(permission);
      const status = requestTimeout
        ? await withTimeout(requestPromise, requestTimeout, permission)
        : await requestPromise;
      if (generation.current !== gen) return status;
      setNativeStatus(status);
      setFlowState((s) => {
        const next = transition(s, { type: "REQUEST_RESULT", status });
        logger.transition(s, next, `REQUEST_RESULT:${status}`);
        if ((next === "granted" || next === "limited") && s !== "granted" && s !== "limited")
          onGrant?.();
        if (next === "denied") onDeny?.();
        if (next === "blockedPrompt") onBlock?.();
        return next;
      });
      return status;
    } catch (err) {
      if (generation.current !== gen) return "denied";
      if (err instanceof PermissionTimeoutError) {
        logger.info(`refresh timed out after ${requestTimeout}ms`);
        onTimeout?.();
        setFlowState("blockedPrompt");
        return "blocked";
      }
      setFlowState("denied");
      return "denied";
    } finally {
      isRequesting.current = false;
    }
  }, [
    engine,
    permission,
    requestTimeout,
    onTimeout,
    logger,
    onGrant,
    onDeny,
    onBlock,
    nativeStatus,
  ]);

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

  // AppState listener: settings-return recheck (always), plus optional
  // foreground recheck on every background→active when recheckOnForeground
  // is enabled.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      const cameForeground =
        appStateRef.current.match(/inactive|background/) && nextAppState === "active";
      if (cameForeground) {
        if (waitingForSettings.current) {
          waitingForSettings.current = false;
          recheckAfterSettings();
        } else if (recheckOnForeground) {
          checkPermission();
        }
      }
      appStateRef.current = nextAppState;
    });
    return () => subscription.remove();
  }, [recheckAfterSettings, recheckOnForeground, checkPermission]);

  // Engine-specific metadata snapshot. Optional engine method — returns
  // empty object when the resolved engine has nothing to report. Read on
  // every render; the engine is expected to cache internally so this is
  // cheap. State updates (check/request/refresh) trigger re-renders, which
  // in turn re-read the latest metadata without any synchronization work.
  const metadata: PermissionMetadata = engine.getMetadata ? engine.getMetadata() : {};

  // Compute the hook-level UI node for the current state. Returns null when
  // the state does not match a configured render prop, or when the relevant
  // prompt config is missing. This lets imperative flows use render-prop
  // ergonomics without wrapping in PermissionGate.
  let ui: ReturnType<NonNullable<typeof renderPrePrompt>> | null = null;
  if (flowState === "prePrompt" && renderPrePrompt && prePrompt) {
    ui = renderPrePrompt({
      config: prePrompt,
      onConfirm: requestPermission,
      onCancel: dismiss,
    });
  } else if (flowState === "blockedPrompt" && renderBlockedPrompt && blockedPrompt) {
    ui = renderBlockedPrompt({
      config: blockedPrompt,
      onOpenSettings: goToSettings,
      onDismiss: dismissBlocked,
    });
  }

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
    refresh,
    metadata,
    ui,
  };
}
