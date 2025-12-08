import {
  getCallExpr,
  getDownstreamRefs,
  getUpstreamRefs,
  isSynchronous,
} from "../util/ast.js";
import {
  getEffectDepsRefs,
  getEffectFn,
  getEffectFnRefs,
  isProp,
  isStateSetter,
  isUseEffect,
} from "../util/react.js";

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
      if (!isUseEffect(node)) return;
      const effectFnRefs = getEffectFnRefs(context, node);
      const depsRefs = getEffectDepsRefs(context, node);
      if (!effectFnRefs || !depsRefs) return;

      const isSomeDepsProps = depsRefs
        .flatMap((ref) => getUpstreamRefs(context, ref))
        .some((ref) => isProp(ref));

      effectFnRefs
        .filter((ref) => isStateSetter(context, ref))
        .filter((ref) => isSynchronous(ref.identifier, getEffectFn(node)))
        .forEach((ref) => {
          const callExpr = getCallExpr(ref);

          const argsUpstreamRefs = callExpr.arguments
            .flatMap((arg) => getDownstreamRefs(context, arg))
            .flatMap((ref) => getUpstreamRefs(context, ref));
          // Avoid overlap with no-derived-state
          const isSomeArgsNotProps =
            // TODO: literals check may be less reliable with *all* upstream refs...
            // What if that was `getUpstreamNodes()` instead, returning AST nodes?
            // Could get complicated though. Ideally we may restructure the rules to not need this at all?
            argsUpstreamRefs.length === 0 || // All literals
            argsUpstreamRefs.some((ref) => !isProp(ref));

          if (isSomeDepsProps && isSomeArgsNotProps) {
            context.report({
              node: callExpr,
              messageId: "avoidAdjustingStateWhenAPropChanges",
            });
          }
        });
    },
  }),
};
