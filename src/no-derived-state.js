import {
  getEffectFnRefs,
  getEffectDepsRefs,
  isImmediateCall,
  isStateSetter,
  getUseStateNode,
  isProp,
  isState,
  hasCleanup,
  isUseEffect,
  getUpstreamRefs,
} from "./util/react.js";
import { getCallExpr, getDownstreamRefs } from "./util/ast.js";

/**
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow storing derived state in an effect.",
      url: "https://react.dev/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state",
    },
    schema: [],
    messages: {
      avoidDerivedState:
        'Avoid storing derived state. Compute "{{state}}" directly during render, optionally with `useMemo` if it\'s expensive.',
    },
  },
  create: (context) => ({
    CallExpression: (node) => {
      if (!isUseEffect(node) || hasCleanup(node)) return;
      const effectFnRefs = getEffectFnRefs(context, node);
      const depsRefs = getEffectDepsRefs(context, node);
      if (!effectFnRefs || !depsRefs) return;

      effectFnRefs
        .filter((ref) => isStateSetter(context, ref))
        .filter((ref) => isImmediateCall(ref.identifier))
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

          const argsUpstreamRefs = argsRefs.flatMap((ref) =>
            getUpstreamRefs(context, ref),
          );
          const depsUpstreamRefs = depsRefs.flatMap((ref) =>
            getUpstreamRefs(context, ref),
          );
          const isAllArgsInDeps = argsUpstreamRefs.notEmptyEvery((argRef) =>
            depsUpstreamRefs.some(
              (depRef) => argRef.resolved.name === depRef.resolved.name,
            ),
          );
          const isValueAlwaysInSync = isAllArgsInDeps && countCalls(ref) === 1;

          if (isAllArgsInternal || isValueAlwaysInSync) {
            context.report({
              node: callExpr,
              messageId: "avoidDerivedState",
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
