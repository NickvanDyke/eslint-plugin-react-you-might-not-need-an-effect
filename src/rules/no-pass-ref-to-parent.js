import {
  getEffectFnRefs,
  getEffectDepsRefs,
  isPropCallback,
  isRef,
  hasCleanup,
  isUseEffect,
  getUpstreamRefs,
  isRefCall,
} from "../util/ast.js";
import { getCallExpr, getDownstreamRefs } from "../util/ast.js";

/**
 * @type {import("eslint").Rule.RuleModule}
 */
export default {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow passing refs, or data from callbacks registered on them, to parents in an effect. Use `forwardRef` instead.",
      url: "https://react.dev/reference/react/forwardRef",
    },
    schema: [],
    messages: {
      avoidPassingRefToParent:
        "Avoid passing refs to parents in an effect. Use `forwardRef` instead.",
      avoidPropCallbackInRefCallback:
        "Avoid calling props inside callbacks registered on refs in an effect. Use `forwardRef` to register the callback in the parent instead.",
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
        .forEach((ref) => {
          const callExpr = getCallExpr(ref);

          const hasRefArg = callExpr.arguments
            .flatMap((arg) => getDownstreamRefs(context, arg))
            .flatMap((ref) => getUpstreamRefs(context, ref))
            .some((ref) => isRef(ref));

          if (hasRefArg) {
            context.report({
              node: callExpr,
              messageId: "avoidPassingRefToParent",
            });
          }
        });

      effectFnRefs
        .filter((ref) => isRefCall(context, ref))
        .forEach((ref) => {
          const callExpr = getCallExpr(ref);

          const passesCallbackDataToParent = callExpr.arguments
            .flatMap((arg) => getDownstreamRefs(context, arg))
            .flatMap((ref) => getUpstreamRefs(context, ref))
            .some((ref) => isPropCallback(context, ref));

          if (passesCallbackDataToParent) {
            context.report({
              node: getCallExpr(ref),
              messageId: "avoidPropCallbackInRefCallback",
            });
          }
        });
    },
  }),
};
