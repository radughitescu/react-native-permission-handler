export type {
  BlockedPromptConfig,
  MultiPermissionEntry,
  MultiplePermissionsConfig,
  MultiplePermissionsResult,
  PermissionCallbacks,
  PermissionFlowEvent,
  PermissionFlowState,
  PermissionHandlerConfig,
  PermissionHandlerResult,
  PrePromptConfig,
} from "./types";

export { transition } from "./core/state-machine";
export { usePermissionHandler } from "./hooks/use-permission-handler";
export { useMultiplePermissions } from "./hooks/use-multiple-permissions";
export { PermissionGate } from "./components/permission-gate";
export type { PermissionGateProps } from "./components/permission-gate";
export { DefaultPrePrompt } from "./components/default-pre-prompt";
export type { DefaultPrePromptProps } from "./components/default-pre-prompt";
export { DefaultBlockedPrompt } from "./components/default-blocked-prompt";
export type { DefaultBlockedPromptProps } from "./components/default-blocked-prompt";
