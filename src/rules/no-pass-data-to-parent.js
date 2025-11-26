import {
  getEffectFnRefs,
  getEffectDepsRefs,
  isPropCallback,
  isUseState,
  isUseRef,
  isProp,
  hasCleanup,
  isUseEffect,
  getUpstreamRefs,
  isImmediateCall,
} from "../util/ast.js";
import { getCallExpr, getDownstreamRefs } from "../util/ast.js";

/**
 * @type {import("eslint").Rule.RuleModule}
 */
export default {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow passing data to parents in an effect.",
      url: "https://react.dev/learn/you-might-not-need-an-effect#passing-data-to-the-parent",
    },
    schema: [],
    messages: {
      avoidPassingDataToParent:
        "Avoid passing data to parents in an effect. Instead, let the parent fetch the data itself and pass it down to the child as a prop.",
    },
  },
  create: (context) => ({
    CallExpression: (node) => {
      if (!isUseEffect(node) || hasCleanup(node)) return;
      const effectFnRefs = getEffectFnRefs(context, node);
      const depsRefs = getEffectDepsRefs(context, node);
      if (!effectFnRefs || !depsRefs) return;

      effectFnRefs
        .filter((ref) => isPropCallback(context, ref))
        .filter((ref) => isImmediateCall(ref.identifier))
        .forEach((ref) => {
          const callExpr = getCallExpr(ref);

          const isAllData =
            callExpr.arguments.length &
            callExpr.arguments
              .flatMap((arg) => getDownstreamRefs(context, arg))
              .flatMap((ref) => getUpstreamRefs(context, ref))
              .notEmptyEvery(
                (ref) => !isUseState(ref) && !isProp(ref) && !isUseRef(ref),
              );

          if (isAllData) {
            context.report({
              node: callExpr,
              messageId: "avoidPassingDataToParent",
            });
          }
        });
    },
  }),
};
