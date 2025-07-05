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

export const name = "no-parent-child-coupling";
export const messages = {
  avoidParentChildCoupling: "avoidParentChildCoupling",
};
export const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow coupling parent behavior or state to a child component in an effect.",
      url: "https://react.dev/learn/you-might-not-need-an-effect#notifying-parent-components-about-state-changes",
    },
    schema: [],
    messages: {
      [messages.avoidParentChildCoupling]:
        "Avoid coupling parent behavior or state to a child component. Instead, lift shared logic or state up to the parent.",
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
        .forEach((ref) => {
          if (isPropCallback(context, ref) && !isHOCProp(ref.resolved)) {
            context.report({
              node: getCallExpr(ref),
              messageId: messages.avoidParentChildCoupling,
            });
          }
        });
    },
  }),
};
