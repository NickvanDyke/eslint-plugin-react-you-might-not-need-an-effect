import noEmptyEffect from "./rules/no-empty-effect.js";
import noAdjustStateOnPropChange from "./rules/no-adjust-state-on-prop-change.js";
import noResetAllStateOnPropChange from "./rules/no-reset-all-state-on-prop-change.js";
import noEventHandler from "./rules/no-event-handler.js";
import noPassLiveStateToParent from "./rules/no-pass-live-state-to-parent.js";
import noInitializeState from "./rules/no-initialize-state.js";
import noChainStateUpdates from "./rules/no-chain-state-updates.js";
import noDerivedState from "./rules/no-derived-state.js";
import noPassDataToParent from "./rules/no-pass-data-to-parent.js";
import noManageParent from "./rules/no-manage-parent.js";
import noPassRefToParent from "./rules/no-pass-ref-to-parent.js";
import globals from "globals";

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
    "no-adjust-state-on-prop-change": noAdjustStateOnPropChange,
    "no-reset-all-state-on-prop-change": noResetAllStateOnPropChange,
    "no-event-handler": noEventHandler,
    "no-pass-live-state-to-parent": noPassLiveStateToParent,
    "no-pass-data-to-parent": noPassDataToParent,
    "no-manage-parent": noManageParent,
    "no-pass-ref-to-parent": noPassRefToParent,
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
    // Required so we can resolve global references to their upstream global variables
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

// Wraps `Array.every()` to return false for empty arrays.
Array.prototype.notEmptyEvery = function (predicate) {
  return this.length > 0 && this.every(predicate);
};
