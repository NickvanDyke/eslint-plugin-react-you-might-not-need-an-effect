import {
  getArgsUpstreamRefs,
  getCallExpr,
  getUpstreamRefs,
  isSynchronous,
} from "../util/ast.js";
import {
  getEffectFnRefs,
  getEffectDepsRefs,
  callsStateSetter,
  getUseStateDecl,
  isProp,
  hasCleanup,
  isState,
  isUseEffect,
  getEffectFn,
} from "../util/react.js";

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
        .filter((ref) => callsStateSetter(context, ref))
        .filter((ref) => isSynchronous(ref.identifier, getEffectFn(node)))
        .forEach((ref) => {
          const callExpr = getCallExpr(ref);
          const useStateNode = getUseStateDecl(context, ref);
          const stateName = (
            useStateNode?.id.elements[0] ?? useStateNode?.id.elements[1]
          )?.name;

          const argsUpstreamRefs = getArgsUpstreamRefs(context, ref);
          const depsUpstreamRefs = depsRefs.flatMap((ref) =>
            getUpstreamRefs(context, ref),
          );
          const isSomeArgsInternal = argsUpstreamRefs.some(
            (ref) => isState(ref) || isProp(ref),
          );

          const isAllArgsInDeps =
            argsUpstreamRefs.length &&
            argsUpstreamRefs.every((argRef) =>
              depsUpstreamRefs.some(
                (depRef) => argRef.resolved == depRef.resolved,
              ),
            );
          const isValueAlwaysInSync = isAllArgsInDeps && countCalls(ref) === 1;

          if (isSomeArgsInternal) {
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
