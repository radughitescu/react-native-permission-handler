const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Patches react-native-permissions's codegenConfig to add ios.modulesProvider.
 *
 * RN 0.81 requires TurboModules to be explicitly registered in RCTModuleProviders
 * via the codegenConfig.ios.modulesProvider field. react-native-permissions v5.x
 * doesn't include this field yet, so the module mapping is empty at runtime.
 *
 * This plugin adds the missing field so the codegen generates the correct mapping.
 * Can be removed once react-native-permissions ships this fix upstream.
 */
module.exports = function withRNPermissionsModuleProvider(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const pkgPath = path.join(
        config.modRequest.projectRoot,
        "node_modules",
        "react-native-permissions",
        "package.json"
      );

      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        if (pkg.codegenConfig && !pkg.codegenConfig.ios?.modulesProvider) {
          pkg.codegenConfig.ios = pkg.codegenConfig.ios || {};
          pkg.codegenConfig.ios.modulesProvider = {
            RNPermissions: "RNPermissions",
          };
          fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
        }
      }

      return config;
    },
  ]);
};
