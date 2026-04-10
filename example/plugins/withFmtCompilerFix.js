const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

/**
 * Fixes fmt compilation error with Xcode 26 beta.
 * Patches fmt's core.h to force constexpr instead of consteval.
 */
module.exports = function withFmtCompilerFix(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const fmtCoreHeader = path.join(
        config.modRequest.platformProjectRoot,
        "Pods",
        "fmt",
        "include",
        "fmt",
        "core.h"
      );

      if (fs.existsSync(fmtCoreHeader)) {
        let content = fs.readFileSync(fmtCoreHeader, "utf-8");
        // Force FMT_USE_CONSTEVAL to 0 at the top of the file
        if (!content.includes("// Xcode 26 fix")) {
          content = `// Xcode 26 fix: force constexpr over consteval\n#undef FMT_USE_CONSTEVAL\n#define FMT_USE_CONSTEVAL 0\n\n${content}`;
          fs.writeFileSync(fmtCoreHeader, content);
        }
      }

      return config;
    },
  ]);
};
