import {
  getEffectFnRefs,
  getEffectDepsRefs,
  isPropCallback,
  isState,
  isRef,
  isProp,
  hasCleanup,
  isUseEffect,
  getUpstreamRefs,
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
        // NOTE: We don't check `isDirectCall` because passing data to the parent is passing data to the parent.
        // And misuses are often indirect, e.g. retrieving and passing up external data in a Promise chain.
        .forEach((ref) => {
          const callExpr = getCallExpr(ref);

          const isAllData =
            callExpr.arguments.length &
            callExpr.arguments
              .flatMap((arg) => getDownstreamRefs(context, arg))
              .flatMap((ref) => getUpstreamRefs(context, ref))
              // `every` instead of the usual `notEmptyEvery` because `getUpstreamRefs` filters out
              // parameters, e.g. in Promise chains or callbacks, but we want to flag passing those.
              // Ideally we'd identify and check the parameter's "source" though...
              .every(
                (ref) =>
                  !isState(ref) &&
                  !isProp(ref) &&
                  // TODO: Should advise to use `forwardRef` instead?
                  // Not always the best solution, but usually, and outliers can silence the warning.
                  // Could possibly check for refs on the "path" to this callback too.
                  // https://github.com/NickvanDyke/eslint-plugin-react-you-might-not-need-an-effect/issues/22
                  // https://github.com/NickvanDyke/eslint-plugin-react-you-might-not-need-an-effect/issues/37
                  !isRef(ref),
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
