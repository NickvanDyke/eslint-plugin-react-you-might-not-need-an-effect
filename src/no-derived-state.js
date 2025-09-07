import {
  getEffectFnRefs,
  getEffectDepsRefs,
  isDirectCall,
  isStateSetter,
  getUseStateNode,
  isProp,
  getUpstreamReactVariables,
  isState,
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
      const effectFnRefs = getEffectFnRefs(context, node);
      const depsRefs = getEffectDepsRefs(context, node);
      if (!effectFnRefs || !depsRefs) return;

      effectFnRefs
        .filter((ref) => isStateSetter(context, ref))
        .filter((ref) => isDirectCall(ref.identifier))
        .forEach((ref) => {
          const callExpr = getCallExpr(ref);
          const useStateNode = getUseStateNode(context, ref);
          const stateName = (
            useStateNode.id.elements[0] ?? useStateNode.id.elements[1]
          )?.name;

          const argsRefs = callExpr.arguments.flatMap((arg) =>
            getDownstreamRefs(context, arg),
          );
          const isAllArgsInternal = argsRefs.notEmptyEvery(
            (ref) => isState(context, ref) || isProp(context, ref),
          );

          const argsUpstreamVars = callExpr.arguments
            .flatMap((arg) => getDownstreamRefs(context, arg))
            .flatMap((ref) => getUpstreamReactVariables(context, ref.resolved));
          const depsUpstreamVars = depsRefs.flatMap((ref) =>
            getUpstreamReactVariables(context, ref.resolved),
          );
          const isAllArgsInDeps = argsUpstreamVars.notEmptyEvery((argVar) =>
            depsUpstreamVars.some((depVar) => argVar.name === depVar.name),
          );
          const isValueAlwaysInSync = isAllArgsInDeps && countCalls(ref) === 1;

          if (isAllArgsInternal || isValueAlwaysInSync) {
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

const countCalls = (ref) =>
  ref.resolved.references.filter(
    (ref) => ref.identifier.parent.type === "CallExpression",
  ).length;
