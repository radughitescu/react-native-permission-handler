import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import {
  type PermissionStatus,
  check,
  checkNotifications,
  openSettings,
  request,
  requestNotifications,
} from "react-native-permissions";
import { transition } from "../core/state-machine";
import type {
  PermissionFlowState,
  PermissionHandlerConfig,
  PermissionHandlerResult,
} from "../types";

function isNotifications(
  permission: PermissionHandlerConfig["permission"],
): permission is "notifications" {
  return permission === "notifications";
}

export function usePermissionHandler(config: PermissionHandlerConfig): PermissionHandlerResult {
  const [flowState, setFlowState] = useState<PermissionFlowState>("idle");
  const [nativeStatus, setNativeStatus] = useState<PermissionStatus | null>(null);
  const isRequesting = useRef(false);
  const waitingForSettings = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  const { permission, autoCheck = true, onGrant, onDeny, onBlock, onSettingsReturn } = config;

  const checkPermission = useCallback(async () => {
    setFlowState((s) => transition(s, { type: "CHECK" }));
    try {
      let status: PermissionStatus;
      if (isNotifications(permission)) {
        const result = await checkNotifications();
        status = result.status;
      } else {
        status = await check(permission);
      }
      setNativeStatus(status);
      setFlowState((s) => {
        const next = transition(s, { type: "CHECK_RESULT", status });
        if (next === "granted" && s !== "granted") onGrant?.();
        return next;
      });
    } catch {
      setFlowState("idle");
    }
  }, [permission, onGrant]);

  const requestPermission = useCallback(async () => {
    if (isRequesting.current) return;
    isRequesting.current = true;

    setFlowState((s) => transition(s, { type: "PRE_PROMPT_CONFIRM" }));
    try {
      let status: PermissionStatus;
      if (isNotifications(permission)) {
        const result = await requestNotifications(["alert", "badge", "sound"]);
        status = result.status;
      } else {
        status = await request(permission);
      }
      setNativeStatus(status);
      setFlowState((s) => {
        const next = transition(s, { type: "REQUEST_RESULT", status });
        if (next === "granted") onGrant?.();
        if (next === "denied") onDeny?.();
        if (next === "blockedPrompt") onBlock?.();
        return next;
      });
    } catch {
      setFlowState("denied");
    } finally {
      isRequesting.current = false;
    }
  }, [permission, onGrant, onDeny, onBlock]);

  const dismiss = useCallback(() => {
    setFlowState((s) => transition(s, { type: "PRE_PROMPT_DISMISS" }));
    onDeny?.();
  }, [onDeny]);

  const goToSettings = useCallback(async () => {
    setFlowState((s) => transition(s, { type: "OPEN_SETTINGS" }));
    waitingForSettings.current = true;
    try {
      await openSettings();
    } catch {
      waitingForSettings.current = false;
      setFlowState("blockedPrompt");
    }
  }, []);

  const recheckAfterSettings = useCallback(async () => {
    setFlowState((s) => transition(s, { type: "SETTINGS_RETURN" }));
    try {
      let status: PermissionStatus;
      if (isNotifications(permission)) {
        const result = await checkNotifications();
        status = result.status;
      } else {
        status = await check(permission);
      }
      setNativeStatus(status);
      setFlowState((s) => {
        const next = transition(s, { type: "RECHECK_RESULT", status });
        if (next === "granted") onGrant?.();
        onSettingsReturn?.(next === "granted");
        return next;
      });
    } catch {
      setFlowState("blockedPrompt");
    }
  }, [permission, onGrant, onSettingsReturn]);

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
    openSettings: goToSettings,
  };
}
