import { getCallExpr, getDownstreamRefs } from "./util/ast.js";
import {
  getDependenciesRefs,
  getEffectFnRefs,
  getUpstreamReactVariables,
  isDirectCall,
  isFnRef,
  isProp,
  isStateSetter,
  isUseEffect,
} from "./util/react.js";

export const name = "no-adjust-state-when-a-prop-changes";
export const messages = {
  avoidAdjustingStateWhenAPropChanges: "avoidAdjustingStateWhenAPropChanges",
};
export const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow adjusting state in an effect when a prop changes.",
      url: "https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes",
    },
    schema: [],
    messages: {
      [messages.avoidAdjustingStateWhenAPropChanges]:
        "Avoid adjusting state when a prop changes. Instead, adjust the state directly during render, or refactor your state to avoid this need entirely.",
    },
  },
  create: (context) => ({
    CallExpression: (node) => {
      if (!isUseEffect(node)) return;
      const effectFnRefs = getEffectFnRefs(context, node);
      const depsRefs = getDependenciesRefs(context, node);
      if (!effectFnRefs || !depsRefs) return;

      const isAllDepsProps = depsRefs
        .flatMap((ref) => getUpstreamReactVariables(context, ref.resolved))
        .notEmptyEvery((variable) => isProp(variable));

      effectFnRefs
        .filter(isFnRef)
        .filter((ref) => isDirectCall(ref.identifier))
        .filter((ref) => isStateSetter(context, ref))
        .forEach((ref) => {
          const callExpr = getCallExpr(ref);

          const argsUpstreamVariables = callExpr.arguments
            .flatMap((arg) => getDownstreamRefs(context, arg))
            .flatMap((ref) => getUpstreamReactVariables(context, ref.resolved));

          if (isAllDepsProps && argsUpstreamVariables.length === 0) {
            context.report({
              node: callExpr,
              messageId: messages.avoidAdjustingStateWhenAPropChanges,
            });
          }
        });
    },
  }),
};
