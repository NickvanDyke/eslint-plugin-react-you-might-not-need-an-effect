import { getArgsUpstreamRefs, getCallExpr } from "../util/ast.js";
import {
  getEffectFnRefs,
  getEffectDepsRefs,
  callsProp,
  isRef,
  hasCleanup,
  isUseEffect,
  callsRef,
} from "../util/react.js";

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
      avoidReceivingRefFromParent:
        "Avoid receiving refs from parents to use in an effect. Use `forwardRef` instead.",
    },
  },
  create: (context) => ({
    CallExpression: (node) => {
      if (!isUseEffect(node) || hasCleanup(node)) return;
      const effectFnRefs = getEffectFnRefs(context, node);
      const depsRefs = getEffectDepsRefs(context, node);
      if (!effectFnRefs || !depsRefs) return;

      effectFnRefs
        .filter((ref) => callsProp(context, ref))
        .forEach((ref) => {
          const callExpr = getCallExpr(ref);

          const hasRefArg = getArgsUpstreamRefs(context, ref).some((ref) =>
            isRef(ref),
          );

          if (hasRefArg) {
            context.report({
              node: callExpr,
              messageId: "avoidPassingRefToParent",
            });
          }
        });

      effectFnRefs
        .filter((ref) => callsRef(context, ref))
        .forEach((ref) => {
          const callExpr = getCallExpr(ref);

          const passesDataToParent = getArgsUpstreamRefs(context, ref).some(
            (ref) => callsProp(context, ref),
          );

          if (passesDataToParent) {
            context.report({
              node: callExpr,
              messageId: "avoidPropCallbackInRefCallback",
            });
          }
        });

      effectFnRefs
        .filter((ref) => callsProp(context, ref) && callsRef(context, ref))
        .forEach((ref) => {
          const callExpr = getCallExpr(ref);

          context.report({
            node: callExpr,
            messageId: "avoidReceivingRefFromParent",
          });
        });
    },
  }),
};
