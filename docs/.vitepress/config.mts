import { defineConfig } from "vitepress";

export default defineConfig({
  title: "react-native-permission-handler",
  description:
    "Pluggable permission flows for React Native — pre-prompts, blocked recovery, re-check on foreground.",
  base: "/react-native-permission-handler/",
  cleanUrls: true,
  lastUpdated: true,
  rewrites: {
    "api/README.md": "api/index.md",
    "recipes/README.md": "recipes/index.md",
  },
  ignoreDeadLinks: [/^\.\/docs\//, /README$/],
  srcExclude: [
    "research/**",
    "superpowers/**",
    "medium-article-draft.md",
    "article-assets/**",
    "README.md",
  ],
  themeConfig: {
    siteTitle: "Permission Handler",
    nav: [
      { text: "Documentation", link: "/guide/getting-started" },
      { text: "Changelog", link: "/changelog" },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Getting Started", link: "/guide/getting-started" },
          { text: "Before & After", link: "/before-after" },
          { text: "iOS Privacy Manifest", link: "/guides/ios-privacy-manifest" },
        ],
      },
      {
        text: "API Reference",
        items: [
          { text: "Overview", link: "/api/" },
          { text: "usePermissionHandler", link: "/api/use-permission-handler" },
          { text: "useMultiplePermissions", link: "/api/use-multiple-permissions" },
          { text: "PermissionGate", link: "/api/permission-gate" },
          { text: "Engines", link: "/api/engines" },
          { text: "Types", link: "/api/types" },
        ],
      },
      {
        text: "Recipes",
        items: [
          { text: "Overview", link: "/recipes/" },
          {
            text: "Basics",
            collapsed: false,
            items: [
              { text: "Onboarding Wall", link: "/recipes/onboarding-wall" },
              { text: "Re-check on Foreground", link: "/recipes/recheck-on-foreground" },
              { text: "Stale Permission State", link: "/recipes/stale-permission-state" },
              { text: "Android Normalization", link: "/recipes/android-normalization" },
            ],
          },
          {
            text: "Advanced patterns",
            collapsed: false,
            items: [
              { text: "Background Location", link: "/recipes/background-location" },
              { text: "BLE Device Pairing", link: "/recipes/ble-device-pairing" },
              { text: "Limited Photo Upgrade", link: "/recipes/limited-photo-upgrade" },
              { text: "Speech Recognition", link: "/recipes/speech-recognition" },
              { text: "Voice Note Composer", link: "/recipes/voice-note-composer" },
            ],
          },
          {
            text: "Testing",
            collapsed: false,
            items: [{ text: "Testing Engine", link: "/recipes/testing-with-testing-engine" }],
          },
        ],
      },
    ],
    search: { provider: "local" },
    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/radughitescu/react-native-permission-handler",
      },
    ],
    editLink: {
      pattern:
        "https://github.com/radughitescu/react-native-permission-handler/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },
    outline: [2, 3],
  },
});
