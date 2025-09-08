import { getCallExpr } from "./util/ast.js";
import {
  getEffectDepsRefs,
  getEffectFnRefs,
  isArgsAllLiterals,
  isDirectCall,
  isProp,
  isStateSetter,
} from "./util/react.js";

/**
 * @type {import("eslint").Rule.RuleModule}
 */
export default {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow adjusting state in an effect when a prop changes.",
      url: "https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes",
    },
    schema: [],
    messages: {
      avoidAdjustingStateWhenAPropChanges:
        "Avoid adjusting state when a prop changes. Instead, adjust the state directly during render, or refactor your state to avoid this need entirely.",
    },
  },
  create: (context) => ({
    CallExpression: (node) => {
      const effectFnRefs = getEffectFnRefs(context, node);
      const depsRefs = getEffectDepsRefs(context, node);
      if (!effectFnRefs || !depsRefs) return;

      const isAllDepsProps = depsRefs.notEmptyEvery((ref) =>
        isProp(context, ref),
      );

      effectFnRefs
        .filter((ref) => isStateSetter(context, ref))
        .filter((ref) => isDirectCall(ref.identifier))
        .forEach((ref) => {
          const callExpr = getCallExpr(ref);

          if (isAllDepsProps && isArgsAllLiterals(context, callExpr)) {
            context.report({
              node: callExpr,
              messageId: "avoidAdjustingStateWhenAPropChanges",
            });
          }
        });
    },
  }),
};
