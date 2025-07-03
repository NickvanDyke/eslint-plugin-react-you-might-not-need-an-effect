import { messageIds, messages } from "./messages.js";
import {
  findDownstreamNodes,
  getCallExpr,
  getDownstreamRefs,
} from "./util/ast.js";
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
  isFnRef,
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

      const isAllDepsInternal = depsRefs
        .flatMap((ref) => getUpstreamReactVariables(context, ref.identifier))
        .notEmptyEvery(
          (variable) =>
            isState(variable) || (isProp(variable) && !isHOCProp(variable)),
        );

      findDownstreamNodes(context, node, "IfStatement")
        // An event-handling effect (invalid) and a synchronizing effect (valid)
        // look quite similar. But the latter should act on *all* possible states,        // whereas the former waits for a specific state (from the event).
        // Technically synchronizing effects can be inlined too.
        // But an effect is arguably more readable (for once), and recommended by the React docs.
        .filter((ifNode) => !ifNode.alternate)
        .filter((ifNode) =>
          getDownstreamRefs(context, ifNode.test)
            .flatMap((ref) =>
              getUpstreamReactVariables(context, ref.identifier),
            )
            // TODO: Include non-HOC props, but probably with a different message -
            // the state would need to be lifted to inline the effect logic
            .notEmptyEvery((variable) => isState(variable)),
        )
        .forEach((ifNode) => {
          context.report({
            node: ifNode.test,
            messageId: messageIds.avoidEventHandler,
          });
        });

      effectFnRefs
        .filter(isFnRef)
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

            const argsRefs = callExpr.arguments.flatMap((arg) =>
              getDownstreamRefs(context, arg),
            );
            const argsUpstreamVariables = argsRefs.flatMap((ref) =>
              getUpstreamReactVariables(context, ref.identifier),
            );

            const isAllArgsInternal = argsUpstreamVariables.notEmptyEvery(
              (variable) =>
                isState(variable) || (isProp(variable) && !isHOCProp(variable)),
            );
            const isSomeArgsExternal = argsUpstreamVariables.some(
              (variable) =>
                (!isState(variable) && !isProp(variable)) ||
                isHOCProp(variable),
            );
            const isAllArgsInDeps = argsRefs
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
          } else if (
            isPropCallback(context, ref) &&
            // Don't analyze HOC prop callbacks -- we don't have control over them to lift state or logic
            !isHOCProp(ref.resolved)
          ) {
            // I'm pretty sure we can flag this regardless of the arguments, including none...
            // Because we are either:
            // 1. Passing live state updates to the parent
            // 2. Using state as an event handler to pass final state to the parent
            context.report({
              node: callExpr,
              messageId: messageIds.avoidParentChildCoupling,
            });
          }
        });
    },
  }),
};
