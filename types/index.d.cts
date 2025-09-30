import type { ESLint, Linter } from "eslint";

declare const plugin: ESLint.Plugin & {
  configs: {
    recommended: Linter.Config;
    "legacy-recommended": Linter.LegacyConfig;
  };
};
export = plugin;
