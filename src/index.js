import { name as ruleName, rule } from "./rule.js";
import * as noEmptyEffect from "./no-empty-effect.js";
import * as noResetAllStateWhenAPropChanges from "./no-reset-all-state-when-a-prop-changes.js";
import globals from "globals";

const plugin = {
  meta: {
    name: "react-you-might-not-need-an-effect",
  },
  configs: {},
  rules: {
    [ruleName]: rule,
    [noEmptyEffect.name]: noEmptyEffect.rule,
    [noResetAllStateWhenAPropChanges.name]:
      noResetAllStateWhenAPropChanges.rule,
  },
};

Object.assign(plugin.configs, {
  // flat config format
  recommended: {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
    plugins: {
      // Object.assign above so we can reference `plugin` here
      [plugin.meta.name]: plugin,
    },
    rules: {
      [plugin.meta.name + "/" + ruleName]: "warn",
      [plugin.meta.name + "/" + noEmptyEffect.name]: "warn",
      [plugin.meta.name + "/" + noResetAllStateWhenAPropChanges.name]: "warn",
    },
    languageOptions: {
      globals: {
        // NOTE: Required so we can resolve global references to their upstream global variables
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
  "legacy-recommended": {
    plugins: [plugin.meta.name],
    rules: {
      [plugin.meta.name + "/" + ruleName]: "warn",
      [plugin.meta.name + "/" + noEmptyEffect.name]: "warn",
      [plugin.meta.name + "/" + noResetAllStateWhenAPropChanges.name]: "warn",
    },
    globals: {
      // NOTE: Required so we can resolve global references to their upstream global variables
      ...globals.browser,
    },
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

export default plugin;
