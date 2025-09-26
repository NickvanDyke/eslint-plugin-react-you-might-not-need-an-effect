import { getCallExpr } from "./util/ast.js";
import {
  getEffectDepsRefs,
  getEffectFnRefs,
  isArgsAllLiterals,
  isImmediateCall,
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
        .filter((ref) => isImmediateCall(ref.identifier))
        .forEach((ref) => {
          const callExpr = getCallExpr(ref);

          // TODO: Flag non-literals too? e.g. I think this is the correct warning for https://github.com/getsentry/sentry/pull/100177/files#diff-cf3aceaba5cdab4553d92644581e23d54914923199d31807fe090e0d49b786caR97
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
