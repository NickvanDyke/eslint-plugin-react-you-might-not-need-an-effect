import {
  getEffectFnRefs,
  getEffectDepsRefs,
  getDownstreamRefs,
  isImmediateCall,
  isStateSetter,
  getUseStateDecl,
  isProp,
  isUseState,
  hasCleanup,
  isUseEffect,
  getUpstreamRefs,
  getCallExpr,
} from "../util/ast.js";

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
      avoidSingleSetter:
        'Avoid storing derived state. "{{state}}" is only set here, and thus could be computed directly during render.',
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
          const useStateNode = getUseStateDecl(context, ref);
          const stateName = (
            useStateNode.id.elements[0] ?? useStateNode.id.elements[1]
          )?.name;

          const argsUpstreamRefs = callExpr.arguments
            .flatMap((arg) => getDownstreamRefs(context, arg))
            .flatMap((ref) => getUpstreamRefs(context, ref));
          const depsUpstreamRefs = depsRefs.flatMap((ref) =>
            getUpstreamRefs(context, ref),
          );
          const isAllArgsInternal = argsUpstreamRefs.notEmptyEvery(
            (ref) => isUseState(ref) || isProp(ref),
          );

          const isAllArgsInDeps = argsUpstreamRefs.notEmptyEvery((argRef) =>
            depsUpstreamRefs.some(
              (depRef) => argRef.resolved == depRef.resolved,
            ),
          );
          const isValueAlwaysInSync = isAllArgsInDeps && countCalls(ref) === 1;

          if (isAllArgsInternal) {
            context.report({
              node: callExpr,
              messageId: "avoidDerivedState",
              data: { state: stateName },
            });
          } else if (isValueAlwaysInSync) {
            context.report({
              node: callExpr,
              messageId: "avoidSingleSetter",
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
