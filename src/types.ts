import type { Permission, PermissionStatus } from "react-native-permissions";

/**
 * States of the permission flow state machine.
 */
export type PermissionFlowState =
  | "idle"
  | "checking"
  | "prePrompt"
  | "requesting"
  | "granted"
  | "denied"
  | "blocked"
  | "blockedPrompt"
  | "openingSettings"
  | "recheckingAfterSettings"
  | "unavailable";

/**
 * Events that drive state transitions.
 */
export type PermissionFlowEvent =
  | { type: "CHECK" }
  | { type: "CHECK_RESULT"; status: PermissionStatus }
  | { type: "PRE_PROMPT_CONFIRM" }
  | { type: "PRE_PROMPT_DISMISS" }
  | { type: "REQUEST_RESULT"; status: PermissionStatus }
  | { type: "OPEN_SETTINGS" }
  | { type: "SETTINGS_RETURN" }
  | { type: "RECHECK_RESULT"; status: PermissionStatus };

/**
 * Configuration for the pre-prompt modal.
 */
export interface PrePromptConfig {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

/**
 * Configuration for the blocked-prompt modal.
 */
export interface BlockedPromptConfig {
  title: string;
  message: string;
  settingsLabel?: string;
}

/**
 * Callbacks for analytics and side effects.
 */
export interface PermissionCallbacks {
  onGrant?: () => void;
  onDeny?: () => void;
  onBlock?: () => void;
  onSettingsReturn?: (granted: boolean) => void;
}

/**
 * Configuration for usePermissionHandler.
 */
export interface PermissionHandlerConfig extends PermissionCallbacks {
  permission: Permission | "notifications";
  prePrompt: PrePromptConfig;
  blockedPrompt: BlockedPromptConfig;
  autoCheck?: boolean;
  recheckOnForeground?: boolean;
}

/**
 * Return type of usePermissionHandler.
 */
export interface PermissionHandlerResult {
  state: PermissionFlowState;
  nativeStatus: PermissionStatus | null;
  isGranted: boolean;
  isDenied: boolean;
  isBlocked: boolean;
  isChecking: boolean;
  isUnavailable: boolean;
  request: () => void;
  check: () => void;
}

/**
 * Configuration for a single permission within useMultiplePermissions.
 */
export interface MultiPermissionEntry extends PermissionCallbacks {
  permission: Permission | "notifications";
  prePrompt: PrePromptConfig;
  blockedPrompt: BlockedPromptConfig;
}

/**
 * Configuration for useMultiplePermissions.
 */
export interface MultiplePermissionsConfig {
  permissions: MultiPermissionEntry[];
  strategy: "sequential" | "parallel";
  onAllGranted?: () => void;
}

/**
 * Return type of useMultiplePermissions.
 */
export interface MultiplePermissionsResult {
  statuses: Record<string, PermissionFlowState>;
  allGranted: boolean;
  request: () => void;
}
