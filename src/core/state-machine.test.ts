import { describe, expect, it } from "vitest";
import type { PermissionFlowEvent, PermissionFlowState } from "../types";
import { transition } from "./state-machine";

describe("transition — idle", () => {
  it("transitions to checking on CHECK", () => {
    expect(transition("idle", { type: "CHECK" })).toBe("checking");
  });

  it("ignores unrelated events", () => {
    expect(transition("idle", { type: "PRE_PROMPT_CONFIRM" })).toBe("idle");
    expect(transition("idle", { type: "PRE_PROMPT_DISMISS" })).toBe("idle");
    expect(transition("idle", { type: "OPEN_SETTINGS" })).toBe("idle");
    expect(transition("idle", { type: "SETTINGS_RETURN" })).toBe("idle");
  });
});

describe("transition — checking", () => {
  it("transitions to granted on granted status", () => {
    expect(transition("checking", { type: "CHECK_RESULT", status: "granted" })).toBe("granted");
  });

  it("transitions to limited on limited status", () => {
    expect(transition("checking", { type: "CHECK_RESULT", status: "limited" })).toBe("limited");
  });

  it("transitions to prePrompt on denied status", () => {
    expect(transition("checking", { type: "CHECK_RESULT", status: "denied" })).toBe("prePrompt");
  });

  it("transitions to blockedPrompt on blocked status", () => {
    expect(transition("checking", { type: "CHECK_RESULT", status: "blocked" })).toBe(
      "blockedPrompt",
    );
  });

  it("transitions to unavailable on unavailable status", () => {
    expect(transition("checking", { type: "CHECK_RESULT", status: "unavailable" })).toBe(
      "unavailable",
    );
  });

  it("ignores unrelated events", () => {
    expect(transition("checking", { type: "CHECK" })).toBe("checking");
    expect(transition("checking", { type: "PRE_PROMPT_CONFIRM" })).toBe("checking");
  });
});

describe("transition — prePrompt", () => {
  it("transitions to requesting on PRE_PROMPT_CONFIRM", () => {
    expect(transition("prePrompt", { type: "PRE_PROMPT_CONFIRM" })).toBe("requesting");
  });

  it("transitions to denied on PRE_PROMPT_DISMISS", () => {
    expect(transition("prePrompt", { type: "PRE_PROMPT_DISMISS" })).toBe("denied");
  });

  it("re-enters checking on CHECK (supports recheckOnForeground mid-prePrompt)", () => {
    expect(transition("prePrompt", { type: "CHECK" })).toBe("checking");
  });

  it("ignores unrelated events", () => {
    expect(transition("prePrompt", { type: "OPEN_SETTINGS" })).toBe("prePrompt");
  });
});

describe("transition — requesting", () => {
  it("transitions to granted on granted status", () => {
    expect(transition("requesting", { type: "REQUEST_RESULT", status: "granted" })).toBe("granted");
  });

  it("transitions to limited on limited status", () => {
    expect(transition("requesting", { type: "REQUEST_RESULT", status: "limited" })).toBe("limited");
  });

  it("transitions to denied on denied status", () => {
    expect(transition("requesting", { type: "REQUEST_RESULT", status: "denied" })).toBe("denied");
  });

  it("transitions to blockedPrompt on blocked status", () => {
    expect(transition("requesting", { type: "REQUEST_RESULT", status: "blocked" })).toBe(
      "blockedPrompt",
    );
  });

  it("transitions to unavailable on unavailable status", () => {
    expect(transition("requesting", { type: "REQUEST_RESULT", status: "unavailable" })).toBe(
      "unavailable",
    );
  });

  it("ignores unrelated events", () => {
    expect(transition("requesting", { type: "CHECK" })).toBe("requesting");
    expect(transition("requesting", { type: "PRE_PROMPT_CONFIRM" })).toBe("requesting");
  });
});

describe("transition — blockedPrompt", () => {
  it("transitions to openingSettings on OPEN_SETTINGS", () => {
    expect(transition("blockedPrompt", { type: "OPEN_SETTINGS" })).toBe("openingSettings");
  });

  it("transitions to denied on BLOCKED_PROMPT_DISMISS", () => {
    expect(transition("blockedPrompt", { type: "BLOCKED_PROMPT_DISMISS" })).toBe("denied");
  });

  it("re-enters checking on CHECK (supports recheckOnForeground mid-blockedPrompt)", () => {
    expect(transition("blockedPrompt", { type: "CHECK" })).toBe("checking");
  });

  it("ignores unrelated events", () => {
    expect(transition("blockedPrompt", { type: "PRE_PROMPT_CONFIRM" })).toBe("blockedPrompt");
  });
});

describe("transition — openingSettings", () => {
  it("transitions to recheckingAfterSettings on SETTINGS_RETURN", () => {
    expect(transition("openingSettings", { type: "SETTINGS_RETURN" })).toBe(
      "recheckingAfterSettings",
    );
  });

  it("ignores unrelated events", () => {
    expect(transition("openingSettings", { type: "CHECK" })).toBe("openingSettings");
    expect(transition("openingSettings", { type: "OPEN_SETTINGS" })).toBe("openingSettings");
  });
});

describe("transition — recheckingAfterSettings", () => {
  it("transitions to granted on granted status", () => {
    expect(
      transition("recheckingAfterSettings", {
        type: "RECHECK_RESULT",
        status: "granted",
      }),
    ).toBe("granted");
  });

  it("transitions to limited on limited status", () => {
    expect(
      transition("recheckingAfterSettings", {
        type: "RECHECK_RESULT",
        status: "limited",
      }),
    ).toBe("limited");
  });

  it("transitions to blockedPrompt on blocked status", () => {
    expect(
      transition("recheckingAfterSettings", {
        type: "RECHECK_RESULT",
        status: "blocked",
      }),
    ).toBe("blockedPrompt");
  });

  it("transitions to blockedPrompt on denied status", () => {
    expect(
      transition("recheckingAfterSettings", {
        type: "RECHECK_RESULT",
        status: "denied",
      }),
    ).toBe("blockedPrompt");
  });

  it("transitions to unavailable on unavailable status", () => {
    expect(
      transition("recheckingAfterSettings", {
        type: "RECHECK_RESULT",
        status: "unavailable",
      }),
    ).toBe("unavailable");
  });

  it("ignores unrelated events", () => {
    expect(transition("recheckingAfterSettings", { type: "CHECK" })).toBe(
      "recheckingAfterSettings",
    );
  });
});

describe("transition — terminal states allow re-checking", () => {
  it("granted → checking on CHECK", () => {
    expect(transition("granted", { type: "CHECK" })).toBe("checking");
  });

  it("limited → checking on CHECK", () => {
    expect(transition("limited", { type: "CHECK" })).toBe("checking");
  });

  it("denied → checking on CHECK", () => {
    expect(transition("denied", { type: "CHECK" })).toBe("checking");
  });

  it("unavailable → checking on CHECK", () => {
    expect(transition("unavailable", { type: "CHECK" })).toBe("checking");
  });

  it("granted ignores unrelated events", () => {
    expect(transition("granted", { type: "OPEN_SETTINGS" })).toBe("granted");
  });

  it("limited ignores unrelated events", () => {
    expect(transition("limited", { type: "OPEN_SETTINGS" })).toBe("limited");
  });

  it("denied ignores unrelated events", () => {
    expect(transition("denied", { type: "OPEN_SETTINGS" })).toBe("denied");
  });

  it("unavailable ignores unrelated events", () => {
    expect(transition("unavailable", { type: "OPEN_SETTINGS" })).toBe("unavailable");
  });
});

describe("transition — blocked state", () => {
  it("stays blocked on any event", () => {
    expect(transition("blocked", { type: "CHECK" })).toBe("blocked");
    expect(transition("blocked", { type: "OPEN_SETTINGS" })).toBe("blocked");
    expect(transition("blocked", { type: "PRE_PROMPT_CONFIRM" })).toBe("blocked");
  });
});

describe("transition — RESET from any state", () => {
  const allStates: PermissionFlowState[] = [
    "idle",
    "checking",
    "prePrompt",
    "requesting",
    "granted",
    "limited",
    "denied",
    "blocked",
    "blockedPrompt",
    "openingSettings",
    "recheckingAfterSettings",
    "unavailable",
  ];

  for (const state of allStates) {
    it(`${state} → idle on RESET`, () => {
      expect(transition(state, { type: "RESET" })).toBe("idle");
    });
  }
});

describe("transition — robustness: no state throws on any event", () => {
  const allStates: PermissionFlowState[] = [
    "idle",
    "checking",
    "prePrompt",
    "requesting",
    "granted",
    "limited",
    "denied",
    "blocked",
    "blockedPrompt",
    "openingSettings",
    "recheckingAfterSettings",
    "unavailable",
  ];

  const allEvents: PermissionFlowEvent[] = [
    { type: "CHECK" },
    { type: "CHECK_RESULT", status: "granted" },
    { type: "CHECK_RESULT", status: "denied" },
    { type: "CHECK_RESULT", status: "blocked" },
    { type: "CHECK_RESULT", status: "unavailable" },
    { type: "CHECK_RESULT", status: "limited" },
    { type: "PRE_PROMPT_CONFIRM" },
    { type: "PRE_PROMPT_DISMISS" },
    { type: "BLOCKED_PROMPT_DISMISS" },
    { type: "RESET" },
    { type: "REQUEST_RESULT", status: "granted" },
    { type: "REQUEST_RESULT", status: "denied" },
    { type: "REQUEST_RESULT", status: "blocked" },
    { type: "REQUEST_RESULT", status: "limited" },
    { type: "OPEN_SETTINGS" },
    { type: "SETTINGS_RETURN" },
    { type: "RECHECK_RESULT", status: "granted" },
    { type: "RECHECK_RESULT", status: "denied" },
    { type: "RECHECK_RESULT", status: "blocked" },
    { type: "RECHECK_RESULT", status: "limited" },
  ];

  for (const state of allStates) {
    for (const event of allEvents) {
      it(`does not throw: state=${state}, event=${event.type}`, () => {
        expect(() => transition(state, event)).not.toThrow();
      });
    }
  }
});
