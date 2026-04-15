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
  | { type: "RECHECK_RESULT"; status: PermissionStatus }
  | { type: "REFRESH" };

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
  prePrompt?: PrePromptConfig;
  blockedPrompt?: BlockedPromptConfig;
  autoCheck?: boolean;
  recheckOnForeground?: boolean;
  requestTimeout?: number;
  onTimeout?: () => void;
  debug?: boolean | ((msg: string) => void);
  /**
   * Skip the pre-prompt state and transition checking → requesting directly
   * on denied status. Useful for composer/inline-action flows (voice notes,
   * camera button in chat) where a pre-prompt is redundant.
   *
   * - `true`: always skip (WARNING: on iOS, burns the one-shot system dialog
   *   without user warm-up — high risk of permanent denial).
   * - `"android"`: skip only on Android (Android allows 2 dialog attempts, so
   *   this is safer than `true`).
   * - `false` / omitted: never skip (default, safest UX).
   */
  skipPrePrompt?: boolean | "android";
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
  /**
   * Request full access when currently in the `limited` state (iOS 14+ photo
   * library partial access). Calls `engine.requestFullAccess()` and re-checks
   * the permission afterwards to update the hook state. Throws a clear error
   * if the current engine does not implement `requestFullAccess`.
   */
  requestFullAccess: () => Promise<PermissionStatus>;
  /**
   * Force a fresh permission request, bypassing `check()`. Use this when the
   * native status reports `granted` but the permission is functionally broken
   * (e.g. iOS 18 camera/photo corrupted-grant bug after a system update) and
   * you need to trigger native re-consent explicitly.
   *
   * Unlike `check()`, `refresh()` goes straight to `engine.request()` so the
   * native layer re-evaluates. From terminal states (`granted`, `limited`,
   * `denied`, `blocked`, `unavailable`) the hook transitions to `requesting`.
   * From non-terminal states (mid-flow) `refresh()` is a no-op that returns
   * the current native status unchanged.
   *
   * Returns the new `PermissionStatus` after the request completes.
   */
  refresh: () => Promise<PermissionStatus>;
}

/**
 * Configuration for a single permission within useMultiplePermissions.
 */
export interface MultiPermissionEntry extends PermissionCallbacks {
  /**
   * Optional stable identifier used as the key in `statuses` and `handlers`
   * records. When omitted, the permission string is used as the key.
   * Enables platform-agnostic row rendering without Platform.select at call sites.
   */
  id?: string;
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
  /**
   * True only when the permission list is non-empty and every entry is
   * granted or limited. Empty lists intentionally return false so that
   * dynamically-built permission arrays never render protected UI
   * without actually granting any permission.
   */
  allGranted: boolean;
  handlers: Record<string, MultiPermissionHandler>;
  activePermission: string | null;
  blockedPermissions: string[];
  request: () => void;
  reset: () => void;
  /**
   * Resume a stopped sequential flow. Rebuilds the pending queue from
   * entries whose current status is not granted/limited and starts the
   * first one. No-op in parallel mode or when nothing is pending.
   * Unlike `request()`, this does not re-check already-granted permissions.
   */
  resume: () => void;
}
