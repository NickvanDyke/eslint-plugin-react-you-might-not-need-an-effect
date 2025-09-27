import { getCallExpr } from "./util/ast.js";
import {
  getEffectDepsRefs,
  getEffectFnRefs,
  hasCleanup,
  isArgsAllLiterals,
  isImmediateCall,
  isState,
  isStateSetter,
  isUseEffect,
} from "./util/react.js";

/**
 * @type {import("eslint").Rule.RuleModule}
 */
export default {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow chaining state changes in an effect.",
      url: "https://react.dev/learn/you-might-not-need-an-effect#chains-of-computations",
    },
    schema: [],
    messages: {
      avoidChainingStateUpdates:
        "Avoid chaining state changes. When possible, update all relevant state simultaneously.",
    },
  },
  create: (context) => ({
    CallExpression: (node) => {
      if (!isUseEffect(node) || hasCleanup(node)) return;
      const effectFnRefs = getEffectFnRefs(context, node);
      const depsRefs = getEffectDepsRefs(context, node);
      if (!effectFnRefs || !depsRefs) return;

      // TODO: Should filter out setters before checking?
      // exhaustive-deps doesn't enforce one way or the other.
      const isAllDepsState = depsRefs.notEmptyEvery((ref) =>
        isState(context, ref),
      );

      effectFnRefs
        .filter((ref) => isStateSetter(context, ref))
        .filter((ref) => isImmediateCall(ref.identifier))
        .forEach((ref) => {
          const callExpr = getCallExpr(ref);

          if (isAllDepsState && isArgsAllLiterals(context, callExpr)) {
            context.report({
              node: callExpr,
              messageId: "avoidChainingStateUpdates",
            });
          }
        });
    },
  }),
};
