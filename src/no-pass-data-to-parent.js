import {
  isUseEffect,
  getEffectFnRefs,
  getEffectDepsRefs,
  isDirectCall,
  isPropCallback,
  isState,
  isRef,
  isProp,
} from "./util/react.js";
import { getCallExpr, getDownstreamRefs } from "./util/ast.js";

export const name = "no-pass-data-to-parent";
export const messages = {
  avoidPassingDataToParent: "avoidPassingDataToParent",
};
export const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow passing data to parents in an effect.",
      url: "https://react.dev/learn/you-might-not-need-an-effect#passing-data-to-the-parent",
    },
    schema: [],
    messages: {
      [messages.avoidPassingDataToParent]:
        "Avoid passing data to parents in an effect. Instead, let the parent fetch the data itself and pass it down to the child as a prop.",
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
        .filter((ref) => isDirectCall(ref.identifier))
        .forEach((ref) => {
          const callExpr = getCallExpr(ref);

          if (
            callExpr.arguments
              .flatMap((arg) => getDownstreamRefs(context, arg))
              .notEmptyEvery(
                (ref) =>
                  !isState(context, ref) &&
                  !isProp(context, ref) &&
                  !isRef(context, ref),
              )
          ) {
            context.report({
              node: callExpr,
              messageId: messages.avoidPassingDataToParent,
            });
          }
        });
    },
  }),
};
