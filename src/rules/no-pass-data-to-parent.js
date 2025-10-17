import {
  getEffectFnRefs,
  getEffectDepsRefs,
  isPropCallback,
  isState,
  isRef,
  isProp,
  hasCleanup,
  isUseEffect,
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
        // We don't check `isDirectCall` because it shouldn't matter; passing data to the parent is passing data to the parent.
        // And misuses are often indirect, e.g. retrieving and passing up external data in a Promise chain.
        .forEach((ref) => {
          const callExpr = getCallExpr(ref);

          if (
            callExpr.arguments
              .flatMap((arg) => getDownstreamRefs(context, arg))
              // `every` instead of the usual `notEmptyEvery` because `getUpstreamRefs` filters out
              // parameters, e.g. in Promise chains or callbacks, but we want to flag passing those.
              // Ideally we'd identify and check the parameter's "source" though...
              .every(
                (ref) =>
                  !isState(context, ref) &&
                  !isProp(context, ref) &&
                  // TODO: Should advise to use `forwardRef` instead?
                  // Not always the best solution, but usually, and outliers can silence the warning.
                  // Could possibly check for refs on the "path" to this callback too.
                  // https://github.com/NickvanDyke/eslint-plugin-react-you-might-not-need-an-effect/issues/22
                  // https://github.com/NickvanDyke/eslint-plugin-react-you-might-not-need-an-effect/issues/37
                  !isRef(context, ref),
              )
          ) {
            context.report({
              node: callExpr,
              messageId: "avoidPassingDataToParent",
            });
          }
        });
    },
  }),
};
