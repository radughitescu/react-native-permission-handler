import React from "react";
import type { ReactNode } from "react";
import { usePermissionHandler } from "../hooks/use-permission-handler";
import type {
  BlockedPromptConfig,
  PermissionCallbacks,
  PermissionEngine,
  PermissionHandlerResult,
  PrePromptConfig,
} from "../types";
import { DefaultBlockedPrompt } from "./default-blocked-prompt";
import { DefaultPrePrompt } from "./default-pre-prompt";

export interface PermissionGateProps extends PermissionCallbacks {
  permission: string;
  engine?: PermissionEngine;
  prePrompt: PrePromptConfig;
  blockedPrompt: BlockedPromptConfig;
  children: ReactNode;
  fallback?: ReactNode;
  renderPrePrompt?: (props: {
    config: PrePromptConfig;
    onConfirm: () => void;
    onCancel: () => void;
  }) => ReactNode;
  renderBlockedPrompt?: (props: {
    config: BlockedPromptConfig;
    onOpenSettings: () => void;
    onDismiss: () => void;
  }) => ReactNode;
  renderDenied?: (props: { check: () => void }) => ReactNode;
  /**
   * Optional render function called when the permission is in the `limited`
   * state (e.g., iOS 14+ partial photo library access). When omitted, the
   * gate falls through to rendering `children` (backward-compatible with
   * v0.6.0). Receives the full handler result, so you can call
   * `requestFullAccess()` from inside the rendered UI.
   */
  renderLimited?: (result: PermissionHandlerResult) => ReactNode;
}

export function PermissionGate({
  permission,
  engine,
  prePrompt,
  blockedPrompt,
  children,
  fallback = null,
  renderPrePrompt,
  renderBlockedPrompt,
  renderDenied,
  renderLimited,
  onGrant,
  onDeny,
  onBlock,
  onSettingsReturn,
}: PermissionGateProps) {
  const handler = usePermissionHandler({
    permission,
    engine,
    prePrompt,
    blockedPrompt,
    onGrant,
    onDeny,
    onBlock,
    onSettingsReturn,
  });

  if (handler.state === "limited" && renderLimited) {
    return <>{renderLimited(handler)}</>;
  }

  if (handler.isGranted) {
    return <>{children}</>;
  }

  if (handler.isChecking || handler.isUnavailable) {
    return <>{fallback}</>;
  }

  if (handler.isDenied) {
    if (renderDenied) {
      return <>{renderDenied({ check: handler.check })}</>;
    }
    return <>{fallback}</>;
  }

  if (handler.state === "prePrompt" && prePrompt) {
    if (renderPrePrompt) {
      return (
        <>
          {renderPrePrompt({
            config: prePrompt,
            onConfirm: handler.request,
            onCancel: handler.dismiss,
          })}
        </>
      );
    }
    return (
      <DefaultPrePrompt
        visible
        title={prePrompt.title}
        message={prePrompt.message}
        confirmLabel={prePrompt.confirmLabel}
        cancelLabel={prePrompt.cancelLabel}
        onConfirm={handler.request}
        onCancel={handler.dismiss}
      />
    );
  }

  if (handler.state === "blockedPrompt" && blockedPrompt) {
    if (renderBlockedPrompt) {
      return (
        <>
          {renderBlockedPrompt({
            config: blockedPrompt,
            onOpenSettings: handler.openSettings,
            onDismiss: handler.dismissBlocked,
          })}
        </>
      );
    }
    return (
      <DefaultBlockedPrompt
        visible
        title={blockedPrompt.title}
        message={blockedPrompt.message}
        settingsLabel={blockedPrompt.settingsLabel}
        dismissLabel={blockedPrompt.dismissLabel}
        onOpenSettings={handler.openSettings}
        onDismiss={handler.dismissBlocked}
      />
    );
  }

  return <>{fallback}</>;
}
