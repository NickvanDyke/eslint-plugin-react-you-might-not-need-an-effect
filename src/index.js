import noEmptyEffect from "./no-empty-effect.js";
import noAdjustStateWhenAPropChanges from "./no-adjust-state-when-a-prop-changes.js";
import noResetAllStateWhenAPropChanges from "./no-reset-all-state-when-a-prop-changes.js";
import noEventHandler from "./no-event-handler.js";
import noPassLiveStateToParent from "./no-pass-live-state-to-parent.js";
import noInitializeState from "./no-initialize-state.js";
import noChainStateUpdates from "./no-chain-state-updates.js";
import noDerivedState from "./no-derived-state.js";
import noPassDataToParent from "./no-pass-data-to-parent.js";
import noManageParent from "./no-manage-parent.js";
import globals from "globals";
import "./util/javascript.js";

/**
 * @type {import("eslint").ESLint.Plugin}
 */
const plugin = {
  meta: {
    name: "react-you-might-not-need-an-effect",
  },
  configs: {},
  rules: {
    "no-empty-effect": noEmptyEffect,
    "no-adjust-state-when-a-prop-changes": noAdjustStateWhenAPropChanges,
    "no-reset-all-state-when-a-prop-changes": noResetAllStateWhenAPropChanges,
    "no-event-handler": noEventHandler,
    "no-pass-live-state-to-parent": noPassLiveStateToParent,
    "no-pass-data-to-parent": noPassDataToParent,
    "no-manage-parent": noManageParent,
    "no-initialize-state": noInitializeState,
    "no-chain-state-updates": noChainStateUpdates,
    "no-derived-state": noDerivedState,
  },
};

const recommendedRules = Object.keys(plugin.rules).reduce((acc, ruleName) => {
  acc[plugin.meta.name + "/" + ruleName] = "warn";
  return acc;
}, {});
const languageOptions = {
  globals: {
    // NOTE: Required so we can resolve global references to their upstream global variables
    ...globals.browser,
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
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
    rules: recommendedRules,
    languageOptions,
  },
  "legacy-recommended": {
    plugins: [plugin.meta.name],
    rules: recommendedRules,
    ...languageOptions,
  },
});

export default plugin;
