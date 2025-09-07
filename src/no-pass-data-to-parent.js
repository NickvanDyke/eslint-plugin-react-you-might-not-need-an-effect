import {
  isUseEffect,
  getEffectFnRefs,
  getDependenciesRefs,
  isFnRef,
  isDirectCall,
  isPropCallback,
  getUpstreamReactVariables,
  isState,
  isRef,
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
      const depsRefs = getDependenciesRefs(context, node);
      if (!effectFnRefs || !depsRefs) return;

      effectFnRefs
        .filter(isFnRef)
        .filter((ref) => isDirectCall(ref.identifier))
        .filter((ref) => isPropCallback(context, ref))
        .forEach((ref) => {
          const callExpr = getCallExpr(ref);
          const argsUpstreamVariables = callExpr.arguments
            .flatMap((arg) => getDownstreamRefs(context, arg))
            .flatMap((ref) => getUpstreamReactVariables(context, ref.resolved));

          if (
            callExpr.arguments.some((arg) => arg.type === "Literal") ||
            argsUpstreamVariables.some(
              (variable) => !isState(variable) && !isRef(variable),
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
