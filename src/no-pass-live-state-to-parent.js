import {
  isUseEffect,
  getEffectFnRefs,
  getDependenciesRefs,
  isFnRef,
  isDirectCall,
  isPropCallback,
  isHOCProp,
} from "./util/react.js";
import { getCallExpr } from "./util/ast.js";

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
        "Avoid passing live state to parent components in an effect. Instead, lift the state to the parent component and pass it down as a prop.",
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
        .filter((ref) => getCallExpr(ref).arguments.length > 0)
        .forEach((ref) => {
          const callExpr = getCallExpr(ref);
          // TODO: Unsure whether we should care about other things, like whether they're in deps...
          if (callExpr.arguments.some((arg) => arg.type !== "Literal")) {
            context.report({
              node: callExpr,
              messageId: messages.avoidPassingLiveStateToParent,
            });
          }
        });
    },
  }),
};
