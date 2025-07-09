import { getCallExpr, getDownstreamRefs } from "./util/ast.js";
import {
  getDependenciesRefs,
  getEffectFnRefs,
  getUpstreamReactVariables,
  isDirectCall,
  isFnRef,
  isHOCProp,
  isProp,
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

      const isAllDepsInternal = depsRefs
        .flatMap((ref) => getUpstreamReactVariables(context, ref.identifier))
        .notEmptyEvery(
          (variable) =>
            isState(variable) || (isProp(variable) && !isHOCProp(variable)),
        );

      effectFnRefs
        .filter(isFnRef)
        .filter((ref) => isDirectCall(ref.identifier))
        .filter((ref) => isStateSetter(context, ref))
        .forEach((ref) => {
          const callExpr = getCallExpr(ref);
          // TODO: I think this simplifies to "args are all literals"...
          // But the upstream bit also catches intermediate variables that are ultimately literals.
          // We could either remove that and just check `arg.type === "Literal"`,
          // or could make this more readable by returning 'literal' | 'internal' | 'external' from the util functions...

          const argsUpstreamVariables = callExpr.arguments
            .flatMap((arg) => getDownstreamRefs(context, arg))
            .flatMap((ref) =>
              getUpstreamReactVariables(context, ref.identifier),
            );
          const isAllArgsInternal = argsUpstreamVariables.notEmptyEvery(
            (variable) =>
              isState(variable) || (isProp(variable) && !isHOCProp(variable)),
          );
          const isSomeArgsExternal = argsUpstreamVariables.some(
            (variable) =>
              (!isState(variable) && !isProp(variable)) || isHOCProp(variable),
          );

          if (!isAllArgsInternal && !isSomeArgsExternal && isAllDepsInternal) {
            context.report({
              node: callExpr,
              messageId: messages.avoidChainingStateUpdates,
            });
          }
        });
    },
  }),
};
