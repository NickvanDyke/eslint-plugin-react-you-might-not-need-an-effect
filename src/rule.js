import { messageIds, messages } from "./messages.js";
import { getCallExpr, getDownstreamRefs } from "./util/ast.js";
import {
  findPropUsedToResetAllState,
  isUseEffect,
  getUseStateNode,
  getEffectFnRefs,
  getDependenciesRefs,
  isStateSetter,
  isPropCallback,
  isDirectCall,
  getUpstreamReactVariables,
  isState,
  isProp,
  isHOCProp,
  countStateSetterCalls,
} from "./util/react.js";
import { arraysEqual } from "./util/javascript.js";

export const name = "you-might-not-need-an-effect";

export const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Catch unnecessary React useEffect hooks.",
      url: "https://react.dev/learn/you-might-not-need-an-effect",
    },
    schema: [],
    messages: messages,
  },
  create: (context) => ({
    CallExpression: (node) => {
      if (!isUseEffect(node)) {
        return;
      }

      const effectFnRefs = getEffectFnRefs(context, node);
      const depsRefs = getDependenciesRefs(context, node);

      if (!effectFnRefs || !depsRefs) {
        return;
      } else if (effectFnRefs.length === 0) {
        // Hopefully it's obvious the effect can be removed.
        // More a follow-up for once they fix/remove other issues.
        context.report({
          node,
          messageId: messageIds.avoidEmptyEffect,
        });
        return;
      }

      const propUsedToResetAllState = findPropUsedToResetAllState(
        context,
        effectFnRefs,
        depsRefs,
        node,
      );
      if (propUsedToResetAllState) {
        const propName = propUsedToResetAllState.identifier.name;
        context.report({
          node: node,
          messageId: messageIds.avoidResettingStateFromProps,
          data: { prop: propName },
        });
        // Don't flag anything else -- confusing, and this should be fixed first.
        return;
      }

      effectFnRefs
        .filter(
          (ref) =>
            isStateSetter(context, ref) ||
            (isPropCallback(context, ref) &&
              // Don't analyze HOC prop callbacks -- we don't have control over them to lift state or logic
              !isHOCProp(ref.resolved)),
        )
        // Non-direct calls are likely inside a callback passed to an external system like `window.addEventListener`,
        // or a Promise chain that (probably) retrieves external data.
        // Note we'll still analyze derived setters because isStateSetter considers that.
        // Heuristic inspired by https://eslint-react.xyz/docs/rules/hooks-extra-no-direct-set-state-in-use-effect
        .filter((ref) => isDirectCall(ref.identifier))
        .forEach((ref) => {
          const callExpr = getCallExpr(ref);

          if (isStateSetter(context, ref)) {
            const useStateNode = getUseStateNode(context, ref);
            const stateName = (
              useStateNode.id.elements[0] ?? useStateNode.id.elements[1]
            )?.name;

            if (depsRefs.length === 0) {
              context.report({
                node: callExpr,
                messageId: messageIds.avoidInitializingState,
                data: { state: stateName },
              });
            }

            // TODO: Make more readable (and performant)
            const isAllArgsInternal = callExpr.arguments
              .flatMap((arg) => getDownstreamRefs(context, arg))
              .flatMap((ref) =>
                getUpstreamReactVariables(context, ref.identifier),
              )
              .notEmptyEvery(
                (variable) =>
                  isState(variable) ||
                  (isProp(variable) && !isHOCProp(variable)),
              );
            const isSomeArgsExternal = callExpr.arguments
              .flatMap((arg) => getDownstreamRefs(context, arg))
              .flatMap((ref) =>
                getUpstreamReactVariables(context, ref.identifier),
              )
              .some(
                (variable) =>
                  (!isState(variable) && !isProp(variable)) ||
                  isHOCProp(variable),
              );
            const isAllArgsInDeps = callExpr.arguments
              .flatMap((arg) => getDownstreamRefs(context, arg))
              // Need to do this prematurely here because we call notEmptyEvery on the refs,
              // not on the upstream variables (which also filters out parameters)
              // TODO: Think about how to centralize that.
              .filter((ref) =>
                ref.resolved.defs.every((def) => def.type !== "Parameter"),
              )
              .notEmptyEvery((argRef) =>
                depsRefs.some((depRef) =>
                  // If they have the same upstream variables, they're equivalent
                  arraysEqual(
                    getUpstreamReactVariables(context, argRef.identifier),
                    getUpstreamReactVariables(context, depRef.identifier),
                  ),
                ),
              );
            const isAllDepsInternal = depsRefs
              .flatMap((ref) =>
                getUpstreamReactVariables(context, ref.identifier),
              )
              .notEmptyEvery(
                (variable) =>
                  isState(variable) ||
                  (isProp(variable) && !isHOCProp(variable)),
              );

            if (
              isAllArgsInternal ||
              // They are always in sync, regardless of source - could compute during render
              // TODO: Should we *always* check that the args are in deps?
              // Should/could that replace isArgsInternal?
              // Should it be chained state when not?
              (isAllArgsInDeps && countStateSetterCalls(ref) === 1)
            ) {
              context.report({
                node: callExpr,
                messageId: messageIds.avoidDerivedState,
                data: { state: stateName },
              });
            }

            if (
              !isAllArgsInternal &&
              !isSomeArgsExternal &&
              isAllDepsInternal
            ) {
              context.report({
                node: callExpr,
                messageId: messageIds.avoidChainingState,
              });
            }
          } else if (isPropCallback(context, ref)) {
            // I'm pretty sure we can flag this regardless of the arguments, including none...
            //
            // Because we are either:
            // 1. Passing live state updates to the parent
            // 2. Using state as an event handler to pass final state to the parent
            //
            // Both are bad. However I'm not yet sure how we could differentiate #2 to give a better warning.
            //
            // TODO: Can we thus safely assume that state is used as an event handler when the ref is a prop?
            // Normally we can't warn about that because we don't know what the event handler does externally.
            // But when it's a prop, it's internal.
            // I guess it could still be valid when the dep is external state? Or in that case,
            // the issue is the state should be lifted to the parent?
            context.report({
              node: callExpr,
              messageId: messageIds.avoidParentChildCoupling,
            });
          }
        });
    },
  }),
};
