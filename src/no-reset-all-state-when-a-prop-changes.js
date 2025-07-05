import {
  isUseEffect,
  getEffectFnRefs,
  getDependenciesRefs,
  findPropUsedToResetAllState,
} from "./util/react.js";

export const name = "no-reset-all-state-when-a-prop-changes";
export const messages = {
  avoidResettingAllStateWhenAPropChanges:
    "avoidResettingAllStateWhenAPropChanges",
};
export const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow resetting all state in an effect when a prop changes.",
      url: "https://react.dev/learn/you-might-not-need-an-effect#resetting-all-state-when-a-prop-changes",
    },
    schema: [],
    messages: {
      [messages.avoidResettingAllStateWhenAPropChanges]:
        'Avoid resetting all state when a prop changes. If "{{prop}}" is a key, pass it as `key` instead so React will reset the component.',
    },
  },
  create: (context) => ({
    CallExpression: (node) => {
      if (!isUseEffect(node)) return;
      const effectFnRefs = getEffectFnRefs(context, node);
      const depsRefs = getDependenciesRefs(context, node);
      if (!effectFnRefs || !depsRefs) return;

      const propUsedToResetAllState = findPropUsedToResetAllState(
        context,
        effectFnRefs,
        depsRefs,
        node,
      );
      if (propUsedToResetAllState) {
        context.report({
          node: node,
          messageId: messages.avoidResettingAllStateWhenAPropChanges,
          data: { prop: propUsedToResetAllState.identifier.name },
        });
      }
    },
  }),
};
