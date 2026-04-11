import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/engines/rnp.ts",
    "src/engines/expo.ts",
    "src/engines/noop.ts",
    "src/engines/testing.ts",
  ],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ["react", "react-native", "react-native-permissions"],
});
