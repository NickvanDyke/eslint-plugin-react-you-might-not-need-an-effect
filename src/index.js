import * as noEmptyEffect from "./no-empty-effect.js";
import * as noResetAllStateWhenAPropChanges from "./no-reset-all-state-when-a-prop-changes.js";
import * as noEventHandler from "./no-event-handler.js";
import * as noPassLiveStateToParent from "./no-pass-live-state-to-parent.js";
import * as noInitializeState from "./no-initialize-state.js";
import * as noChainStateUpdates from "./no-chain-state-updates.js";
import * as noDerivedState from "./no-derived-state.js";
import * as noManageParent from "./no-manage-parent.js";
import globals from "globals";

const plugin = {
  meta: {
    name: "react-you-might-not-need-an-effect",
  },
  configs: {},
  rules: {
    [noEmptyEffect.name]: noEmptyEffect.rule,
    [noResetAllStateWhenAPropChanges.name]:
      noResetAllStateWhenAPropChanges.rule,
    [noEventHandler.name]: noEventHandler.rule,
    [noPassLiveStateToParent.name]: noPassLiveStateToParent.rule,
    [noInitializeState.name]: noInitializeState.rule,
    [noChainStateUpdates.name]: noChainStateUpdates.rule,
    [noDerivedState.name]: noDerivedState.rule,
    [noManageParent.name]: noManageParent.rule,
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
