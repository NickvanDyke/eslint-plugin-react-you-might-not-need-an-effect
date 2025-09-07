import {
  isUseEffect,
  getEffectFnRefs,
  getEffectDepsRefs,
  isDirectCall,
  isPropCallback,
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
      const depsRefs = getEffectDepsRefs(context, node);
      if (!effectFnRefs || !depsRefs) return;

      effectFnRefs
        .filter((ref) => isPropCallback(context, ref))
        .filter((ref) => isDirectCall(ref.identifier))
        .forEach((ref) => {
          const callExpr = getCallExpr(ref);
          const isStateInArgs = callExpr.arguments
            .flatMap((arg) => getDownstreamRefs(context, arg))
            .some((ref) => isState(context, ref));

          if (isStateInArgs) {
            context.report({
              node: callExpr,
              messageId: messages.avoidPassingLiveStateToParent,
            });
          }
        });
    },
  }),
};
