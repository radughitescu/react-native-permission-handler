export type {
  BlockedPromptConfig,
  MultiPermissionEntry,
  MultiPermissionHandler,
  MultiplePermissionsConfig,
  MultiplePermissionsResult,
  PermissionCallbacks,
  PermissionEngine,
  PermissionFlowEvent,
  PermissionFlowState,
  PermissionHandlerConfig,
  PermissionHandlerResult,
  PermissionStatus,
  PrePromptConfig,
} from "./types";

export { setDefaultEngine } from "./engines/resolve";
export { transition } from "./core/state-machine";
export { usePermissionHandler } from "./hooks/use-permission-handler";
export { useMultiplePermissions } from "./hooks/use-multiple-permissions";
export { PermissionGate } from "./components/permission-gate";
export type { PermissionGateProps } from "./components/permission-gate";
export { DefaultPrePrompt } from "./components/default-pre-prompt";
export type { DefaultPrePromptProps } from "./components/default-pre-prompt";
export { DefaultBlockedPrompt } from "./components/default-blocked-prompt";
export type { DefaultBlockedPromptProps } from "./components/default-blocked-prompt";
export { LimitedUpgradePrompt } from "./components/limited-upgrade-prompt";
export type { LimitedUpgradePromptProps } from "./components/limited-upgrade-prompt";
