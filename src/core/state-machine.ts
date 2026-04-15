import type { PermissionFlowEvent, PermissionFlowState } from "../types";

export function transition(
  state: PermissionFlowState,
  event: PermissionFlowEvent,
): PermissionFlowState {
  if (event.type === "RESET") return "idle";

  switch (state) {
    case "idle":
      if (event.type === "CHECK") return "checking";
      return state;

    case "checking":
      if (event.type === "CHECK_RESULT") {
        switch (event.status) {
          case "granted":
            return "granted";
          case "limited":
            return "limited";
          case "denied":
            return "prePrompt";
          case "blocked":
            return "blockedPrompt";
          case "unavailable":
            return "unavailable";
          default:
            return state;
        }
      }
      return state;

    case "prePrompt":
      if (event.type === "PRE_PROMPT_CONFIRM") return "requesting";
      if (event.type === "PRE_PROMPT_DISMISS") return "denied";
      // CHECK from prePrompt refreshes from reality (e.g. recheckOnForeground
      // fires while a pre-prompt is visible after the user manually toggled
      // the permission in Settings).
      if (event.type === "CHECK") return "checking";
      return state;

    case "requesting":
      if (event.type === "REQUEST_RESULT") {
        switch (event.status) {
          case "granted":
            return "granted";
          case "limited":
            return "limited";
          case "denied":
            return "denied";
          case "blocked":
            return "blockedPrompt";
          default:
            return state;
        }
      }
      return state;

    case "blockedPrompt":
      if (event.type === "OPEN_SETTINGS") return "openingSettings";
      if (event.type === "BLOCKED_PROMPT_DISMISS") return "denied";
      // CHECK from blockedPrompt refreshes from reality (e.g. recheckOnForeground
      // or an external refresh while the blocked recovery UI is visible).
      if (event.type === "CHECK") return "checking";
      return state;

    case "openingSettings":
      if (event.type === "SETTINGS_RETURN") return "recheckingAfterSettings";
      return state;

    case "recheckingAfterSettings":
      if (event.type === "RECHECK_RESULT") {
        switch (event.status) {
          case "granted":
            return "granted";
          case "limited":
            return "limited";
          case "blocked":
            return "blockedPrompt";
          case "denied":
            return "blockedPrompt";
          default:
            return state;
        }
      }
      return state;

    case "granted":
    case "limited":
    case "denied":
    case "unavailable":
      if (event.type === "CHECK") return "checking";
      return state;

    case "blocked":
      return state;

    default:
      return state;
  }
}
