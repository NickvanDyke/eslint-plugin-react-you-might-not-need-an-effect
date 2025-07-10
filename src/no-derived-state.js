import {
  isUseEffect,
  getEffectFnRefs,
  getDependenciesRefs,
  isFnRef,
  isDirectCall,
  isStateSetter,
  getUseStateNode,
  isProp,
  isHOCProp,
  getUpstreamReactVariables,
  isState,
  countCalls,
} from "./util/react.js";
import { getCallExpr, getDownstreamRefs } from "./util/ast.js";

export const name = "no-derived-state";
export const messages = {
  avoidDerivedState: "avoidDerivedState",
};
export const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow storing derived state in an effect.",
      url: "https://react.dev/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state",
    },
    schema: [],
    messages: {
      [messages.avoidDerivedState]:
        'Avoid storing derived state. Compute "{{state}}" directly during render, optionally with `useMemo` if it\'s expensive.',
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
        .filter((ref) => isStateSetter(context, ref))
        .forEach((ref) => {
          const callExpr = getCallExpr(ref);
          const useStateNode = getUseStateNode(context, ref);
          const stateName = (
            useStateNode.id.elements[0] ?? useStateNode.id.elements[1]
          )?.name;

          const argsUpstreamVars = callExpr.arguments
            .flatMap((arg) => getDownstreamRefs(context, arg))
            .flatMap((ref) => getUpstreamReactVariables(context, ref.resolved));
          const depsUpstreamVars = depsRefs.flatMap((ref) =>
            getUpstreamReactVariables(context, ref.resolved),
          );
          const isAllArgsInternal = argsUpstreamVars.notEmptyEvery(
            (variable) =>
              isState(variable) || (isProp(variable) && !isHOCProp(variable)),
          );
          const isAllArgsInDeps = argsUpstreamVars.notEmptyEvery((argVar) =>
            depsUpstreamVars.some((depVar) => argVar.name === depVar.name),
          );

          if (
            isAllArgsInternal ||
            // In this case the derived state will always be in sync,
            // thus it could be computed directly during render
            (isAllArgsInDeps && countCalls(ref) === 1)
          ) {
            context.report({
              node: callExpr,
              messageId: messages.avoidDerivedState,
              data: { state: stateName },
            });
          }
        });
    },
  }),
};
