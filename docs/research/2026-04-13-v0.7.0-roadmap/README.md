# v0.7.0 Research — 2026-04-13

Five-agent research effort to identify v0.7.0+ expansion opportunities for `react-native-permission-handler`. Four phases: Gather → Triangulate → Challenge → Synthesize.

## Artifacts (read in order)

1. [Competitor architectural survey](01-competitors.md) — how direct and adjacent permission libraries are built, patterns-only, no feature lists
2. [Competitor pain points](02-pain-points.md) — 40 real pain points mined from issue trackers, tagged unsolved / solved-poorly / already-solved-by-us
3. [RN dev cold-integration friction](03-dev-friction.md) — 10 realistic scenarios attempted by a persona who only reads the README
4. [Library advocate triage](04-triage.md) — every pain point mapped to already-solved / solvable / needs-new-primitive / out-of-scope
5. [Devil's advocate validated roadmap](05-validated-roadmap.md) — adversarial review; 12 validated, 7 conditional, 13 killed
6. [**v0.7.0+ proposal**](06-v0.7.0-proposal.md) ← start here if you only read one

## Executive summary

**v0.7.0 should be the "finish what we shipped" release.** The research found that v0.6.0 already ships more features than any cold reader perceives, and that the single biggest ecosystem gap — Android post-dialog status normalization — is a perfect fit for our pluggable engine layer.

**Key findings:**

- **Architecturally, we're a category of one.** No other RN permission library has a pluggable engine interface, a state machine, or first-class `limited` support. Competitors model state as flat 3–5-value enums; nobody ships declarative components for React. Our `PermissionGate` + `LimitedUpgradePrompt` pairing is unique.
- **The biggest pain in the ecosystem is Android lies to the OS.** Six compounded upstream tickets report status inconsistencies on API 30/33/34/35/36 — `never_ask_again` hangs on Android 16, `POST_NOTIFICATIONS` returns `denied` on fresh installs, dialog dismissals mis-report as blocked. RNP can't fix this without a breaking change. Our adapter layer can.
- **The biggest friction for new users is documentation, not architecture.** A mid-level RN dev reading only the README completed 5 of 10 scenarios as "workable," 4 as "painful," and 1 as "blocked." None were "smooth." Every scenario required spelunking the TypeScript types to discover features that already ship.
- **Our v0.6.0 limited-access upgrade flow is half-wired.** `LimitedUpgradePrompt` exists, the engine method exists, the state exists — but the hook and `PermissionGate` don't route through it. A one-file fix.

**Recommended v0.7.0 scope:** 10 items, 7 of them Small effort. Headliners are Android normalization + README rewrite. Every shipped v0.6.0 feature gets fully wired and documented. One deferred "DX polish" release (v0.8.0) can follow.

**Four open questions for the maintainer** are listed at the bottom of the [proposal](06-v0.7.0-proposal.md). Once answered, each roadmap item becomes its own brainstorm → spec → plan → execute cycle.
