import React from "react";
import type { ReactNode } from "react";
import { usePermissionHandler } from "../hooks/use-permission-handler";
import type {
  BlockedPromptConfig,
  PermissionCallbacks,
  PermissionEngine,
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
  }) => ReactNode;
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

  if (handler.isGranted) {
    return <>{children}</>;
  }

  if (handler.isChecking || handler.isUnavailable) {
    return <>{fallback}</>;
  }

  if (handler.state === "prePrompt") {
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

  if (handler.state === "blockedPrompt") {
    if (renderBlockedPrompt) {
      return (
        <>
          {renderBlockedPrompt({
            config: blockedPrompt,
            onOpenSettings: handler.openSettings,
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
        onOpenSettings={handler.openSettings}
      />
    );
  }

  return <>{fallback}</>;
}
