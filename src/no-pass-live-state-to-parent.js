import {
  isUseEffect,
  getEffectFnRefs,
  getDependenciesRefs,
  isFnRef,
  isDirectCall,
  isPropCallback,
  isHOCProp,
  getUpstreamReactVariables,
  isState,
} from "./util/react.js";
import { getCallExpr, getDownstreamRefs } from "./util/ast.js";

export const name = "no-pass-live-state-to-parent";
export const messages = {
  avoidPassingLiveStateToParent: "avoidPassingLiveStateToParent",
};
export const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow passing live state to parent components in an effect.",
      url: "https://react.dev/learn/you-might-not-need-an-effect#notifying-parent-components-about-state-changes",
    },
    schema: [],
    messages: {
      [messages.avoidPassingLiveStateToParent]:
        "Avoid passing live state to parents in an effect. Instead, lift the state to the parent and pass it down to the child as a prop.",
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
        .filter(
          (ref) => isPropCallback(context, ref) && !isHOCProp(ref.resolved),
        )
        .forEach((ref) => {
          const callExpr = getCallExpr(ref);
          const argsUpstreamVariables = callExpr.arguments
            .flatMap((arg) => getDownstreamRefs(context, arg))
            .flatMap((ref) =>
              getUpstreamReactVariables(context, ref.identifier),
            );

          if (argsUpstreamVariables.some((variable) => isState(variable))) {
            context.report({
              node: callExpr,
              messageId: messages.avoidPassingLiveStateToParent,
            });
          }
        });
    },
  }),
};
