import { build } from "esbuild";

build({
  entryPoints: ["src/index.cjs"],
  bundle: true,
  sourcemap: true,
  format: "cjs",
  outfile: "./dist/index.cjs",
  platform: "node",
  external: ["eslint"],
});
