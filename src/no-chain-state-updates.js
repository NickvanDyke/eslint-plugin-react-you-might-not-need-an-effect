import { getCallExpr, getDownstreamRefs } from "./util/ast.js";
import {
  getDependenciesRefs,
  getEffectFnRefs,
  getUpstreamReactVariables,
  isDirectCall,
  isFnRef,
  isState,
  isStateSetter,
  isUseEffect,
} from "./util/react.js";

export const name = "no-chain-state-updates";
export const messages = {
  avoidChainingStateUpdates: "avoidChainingStateUpdates",
};
export const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow chaining state changes in an effect.",
      url: "https://react.dev/learn/you-might-not-need-an-effect#chains-of-computations",
    },
    schema: [],
    messages: {
      [messages.avoidChainingStateUpdates]:
        "Avoid chaining state changes. When possible, update all relevant state simultaneously.",
    },
  },
  create: (context) => ({
    CallExpression: (node) => {
      if (!isUseEffect(node)) return;
      const effectFnRefs = getEffectFnRefs(context, node);
      const depsRefs = getDependenciesRefs(context, node);
      if (!effectFnRefs || !depsRefs) return;

      const isAllDepsState = depsRefs
        .flatMap((ref) => getUpstreamReactVariables(context, ref.resolved))
        .notEmptyEvery((variable) => isState(variable));

      effectFnRefs
        .filter(isFnRef)
        .filter((ref) => isDirectCall(ref.identifier))
        .filter((ref) => isStateSetter(context, ref))
        .forEach((ref) => {
          const callExpr = getCallExpr(ref);

          const argsUpstreamVariables = callExpr.arguments
            .flatMap((arg) => getDownstreamRefs(context, arg))
            .flatMap((ref) => getUpstreamReactVariables(context, ref.resolved));

          if (isAllDepsState && argsUpstreamVariables.length === 0) {
            context.report({
              node: callExpr,
              messageId: messages.avoidChainingStateUpdates,
            });
          }
        });
    },
  }),
};
