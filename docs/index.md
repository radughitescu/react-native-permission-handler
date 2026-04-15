---
layout: home
hero:
  name: react-native-permission-handler
  text: Permission flows that actually ship
  tagline: Pre-prompts, blocked recovery, and re-check on foreground — with a pluggable engine for any permissions library.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/radughitescu/react-native-permission-handler
features:
  - title: Pluggable engines
    details: Bring your own permissions library. Ships with react-native-permissions and Expo adapters, plus a testing engine.
  - title: Pre-prompts built in
    details: Explain why you need a permission before the OS dialog fires — the only way iOS permissions can be recovered.
  - title: Blocked recovery
    details: Detect the blocked state and deep-link users into Settings, then re-check when they return.
  - title: Re-check on foreground
    details: Refresh permission state automatically when the app returns from background.
  - title: Limited state support
    details: First-class handling of iOS 14+ limited photo access, with an upgrade path to full access.
  - title: Zero runtime dependencies
    details: Tiny footprint. Two hooks, one component, one engine interface. Pure state machine at the core.
---
