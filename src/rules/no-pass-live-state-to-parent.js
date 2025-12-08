import {
  getCallExpr,
  getDownstreamRefs,
  getUpstreamRefs,
  isSynchronous,
} from "../util/ast.js";
import {
  getEffectFnRefs,
  getEffectDepsRefs,
  isPropCallback,
  isUseState,
  isUseEffect,
  getEffectFn,
} from "../util/react.js";

/**
 * @type {import("eslint").Rule.RuleModule}
 */
export default {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow passing live state to parent components in an effect.",
      url: "https://react.dev/learn/you-might-not-need-an-effect#notifying-parent-components-about-state-changes",
    },
    schema: [],
    messages: {
      avoidPassingLiveStateToParent:
        "Avoid passing live state to parents in an effect. Instead, lift the state to the parent and pass it down to the child as a prop.",
    },
  },
  create: (context) => ({
    CallExpression: (node) => {
      if (!isUseEffect(node)) return;
      const effectFnRefs = getEffectFnRefs(context, node);
      const depsRefs = getEffectDepsRefs(context, node);
      if (!effectFnRefs || !depsRefs) return;

      effectFnRefs
        .filter((ref) => isPropCallback(context, ref))
        .filter((ref) => isSynchronous(ref.identifier, getEffectFn(node)))
        .forEach((ref) => {
          const callExpr = getCallExpr(ref);
          const isStateInArgs = callExpr.arguments
            .flatMap((arg) => getDownstreamRefs(context, arg))
            .flatMap((ref) => getUpstreamRefs(context, ref))
            .some((ref) => isUseState(ref));

          if (isStateInArgs) {
            context.report({
              node: callExpr,
              messageId: "avoidPassingLiveStateToParent",
            });
          }
        });
    },
  }),
};
