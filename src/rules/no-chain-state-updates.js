import {
  getCallExpr,
  getDownstreamRefs,
  getUpstreamRefs,
  getEffectDepsRefs,
  getEffectFnRefs,
  hasCleanup,
  isImmediateCall,
  isUseState,
  isStateSetter,
  isUseEffect,
} from "../util/ast.js";

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

      const isSomeDepsState = depsRefs
        .flatMap((ref) => getUpstreamRefs(context, ref))
        .some((ref) => isUseState(ref));

      effectFnRefs
        .filter((ref) => isStateSetter(context, ref))
        .filter((ref) => isImmediateCall(ref.identifier))
        .forEach((ref) => {
          const callExpr = getCallExpr(ref);

          const argsUpstreamRefs = callExpr.arguments
            .flatMap((arg) => getDownstreamRefs(context, arg))
            .flatMap((ref) => getUpstreamRefs(context, ref));
          // Avoid overlap with no-derived-state
          const isSomeArgsState = argsUpstreamRefs.some((ref) =>
            isUseState(ref),
          );

          if (isSomeDepsState && !isSomeArgsState) {
            context.report({
              node: callExpr,
              messageId: "avoidChainingStateUpdates",
            });
          }
        });
    },
  }),
};
