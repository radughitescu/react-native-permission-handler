/**
 * Permission status values owned by this library.
 * Engines must map their native statuses to these values.
 */
export type PermissionStatus = "granted" | "denied" | "blocked" | "limited" | "unavailable";

/**
 * The pluggable permission engine interface.
 * Implement this to use a custom permissions backend.
 */
export interface PermissionEngine {
  check(permission: string): Promise<PermissionStatus>;
  request(permission: string): Promise<PermissionStatus>;
  openSettings(): Promise<void>;
  requestFullAccess?(permission: string): Promise<PermissionStatus>;
}

/**
 * States of the permission flow state machine.
 */
export type PermissionFlowState =
  | "idle"
  | "checking"
  | "prePrompt"
  | "requesting"
  | "granted"
  | "limited"
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
  | { type: "BLOCKED_PROMPT_DISMISS" }
  | { type: "RESET" }
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
  dismissLabel?: string;
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
  permission: string;
  engine?: PermissionEngine;
  prePrompt: PrePromptConfig;
  blockedPrompt: BlockedPromptConfig;
  autoCheck?: boolean;
  recheckOnForeground?: boolean;
  requestTimeout?: number;
  onTimeout?: () => void;
  debug?: boolean | ((msg: string) => void);
}

/**
 * Return type of usePermissionHandler.
 */
export interface PermissionHandlerResult {
  state: PermissionFlowState;
  nativeStatus: PermissionStatus | null;
  isGranted: boolean;
  isLimited: boolean;
  isDenied: boolean;
  isBlocked: boolean;
  isChecking: boolean;
  isUnavailable: boolean;
  request: () => void;
  check: () => void;
  dismiss: () => void;
  dismissBlocked: () => void;
  openSettings: () => void;
  reset: () => void;
}

/**
 * Configuration for a single permission within useMultiplePermissions.
 */
export interface MultiPermissionEntry extends PermissionCallbacks {
  permission: string;
  prePrompt: PrePromptConfig;
  blockedPrompt: BlockedPromptConfig;
}

/**
 * Configuration for useMultiplePermissions.
 */
export interface MultiplePermissionsConfig {
  permissions: MultiPermissionEntry[];
  strategy: "sequential" | "parallel";
  engine?: PermissionEngine;
  autoCheck?: boolean;
  requestTimeout?: number;
  onTimeout?: () => void;
  debug?: boolean | ((msg: string) => void);
  onAllGranted?: () => void;
}

/**
 * Per-permission action handlers within useMultiplePermissions.
 */
export interface MultiPermissionHandler {
  state: PermissionFlowState;
  request: () => void;
  dismiss: () => void;
  dismissBlocked: () => void;
  openSettings: () => void;
}

/**
 * Return type of useMultiplePermissions.
 */
export interface MultiplePermissionsResult {
  statuses: Record<string, PermissionFlowState>;
  allGranted: boolean;
  handlers: Record<string, MultiPermissionHandler>;
  activePermission: string | null;
  blockedPermissions: string[];
  request: () => void;
  reset: () => void;
}
