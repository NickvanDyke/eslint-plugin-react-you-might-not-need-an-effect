import { getUpstreamVariables } from "./util/ast.js";
import {
  isFnRef,
  isPropRef,
  isPropsUsedToResetAllState,
  isStateRef,
  isUseEffect,
  getEffectFnRefs,
  getDepArrRefs,
  getUseStateNode,
} from "./util/react.js";

export const name = "you-might-not-need-an-effect";

export const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Catch unnecessary React useEffect hooks.",
      url: "https://react.dev/learn/you-might-not-need-an-effect",
    },
    schema: [],
    // TODO: Could include more info in messages, like the relevant node
    // TODO: Possible to detect and warn when `useSyncExternalStore` should be preferred?
    messages: {
      // Overall warning
      avoidInternalEffect:
        "This effect operates entirely on internal React state, with no external dependencies. It is likely unnecessary.",

      // State setter warnings
      avoidDerivedState:
        'Avoid storing derived state. Compute "{{state}}" directly during render, optionally with `useMemo` if it\'s expensive.',
      avoidInitializingState:
        "Avoid initializing state in an effect. Instead, pass the initial value to `useState`.",
      avoidChainingState:
        "Avoid chaining state changes. When possible, update all relevant state simultaneously.",

      // Prop warnings
      avoidManagingParentBehavior:
        "Avoid managing parent behavior. Instead, lift this logic up to the parent component.",
      avoidPassingStateToParent:
        "Avoid making parent components depend on a child's intermediate state. If the parent needs live updates, consider lifting state up.",
      avoidResettingStateFromProps:
        "Avoid resetting state from props. If the prop is a key, pass it as `key` instead so React will reset the component.",

      // TODO: This would be nice, but I'm not sure it can be done accurately
      // Maybe we can accurately warn about this when the state being reacted to is one of our own `useState`s?
      // Because if we have a setter then we have a callback.
      // But, I think that would also warn about valid uses that synchronize internal state to external state.
      // avoidEventHandler:
      //   "Avoid using state as an event handler. Instead, call the event handler directly.",
    },
  },
  create: (context) => ({
    CallExpression: (node) => {
      if (!isUseEffect(node)) {
        return;
      }

      const effectFnRefs = getEffectFnRefs(context, node);
      const depsRefs = getDepArrRefs(context, node);

      if (!effectFnRefs || !depsRefs || effectFnRefs.length === 0) {
        return;
      }

      // TODO: Could include when we reference our own local functions that are themselves pure/internal.
      const isInternalEffect = effectFnRefs
        .concat(depsRefs)
        .every((ref) => isStateRef(context, ref) || isPropRef(context, ref));

      if (isInternalEffect) {
        context.report({
          node,
          messageId: "avoidInternalEffect",
        });
      }

      if (isPropsUsedToResetAllState(context, effectFnRefs, depsRefs, node)) {
        context.report({
          node: node,
          messageId: "avoidResettingStateFromProps",
        });
      }

      if (
        effectFnRefs.concat(depsRefs).every((ref) => isPropRef(context, ref))
      ) {
        // TODO: Generalize this to not need the entire effect?
        // Basically combine it with `avoidPassingStateToParent`.
        context.report({
          node: node,
          messageId: "avoidManagingParentBehavior",
        });
      }

      effectFnRefs
        // Eagerly filter out everything but state setters and prop callbacks;
        // We can't reliably analyze external functions.
        .filter(
          (ref) =>
            isFnRef(ref) &&
            (isStateRef(context, ref) || isPropRef(context, ref)),
        )
        .forEach((ref) => {
          const callExpr = ref.identifier.parent;
          const isDepInArgs = callExpr.arguments.some((arg) =>
            getUpstreamVariables(context, arg).some((variable) =>
              depsRefs.some(
                (depRef) => depRef.identifier.name === variable.name,
              ),
            ),
          );

          if (isInternalEffect) {
            if (isStateRef(context, ref)) {
              const useStateNode = getUseStateNode(context, ref);
              // TODO: Should be: Either this is the only call to the state setter, or the args are all internal (including intermediates).
              // Needs to be outside `isInternalEffect` check for the former.
              // Does it matter whether the args are in the deps array?
              // I guess so, to differentiate between derived and chain state updates.
              if (isDepInArgs) {
                context.report({
                  node: callExpr,
                  messageId: "avoidDerivedState",
                  data: { state: useStateNode.id.elements[0].name },
                });
              } else if (
                depsRefs.some(
                  (ref) => isStateRef(context, ref) || isPropRef(context, ref),
                )
              ) {
                // TODO: Is this a correct assumption by now?
                // Should I flag this whenever the call expr argument is *only* the state?
                // Like this seems more appropriate than "derived" state.
                context.report({
                  node: callExpr,
                  messageId: "avoidChainingState",
                });
              } else {
                context.report({
                  node: callExpr,
                  messageId: "avoidInitializingState",
                });
              }
            }
          }

          // I'm pretty sure we can flag this regardless of the arguments...
          // Even if they are external state, we shouldn't pass them to the parent.
          // Because we are either:
          // 1. Passing live state updates to the parent
          // 2. Using state as an event handler to pass final state to the parent
          // Both are bad. However I'm not yet sure how we could differentiate #2 to give a better warning.
          // TODO: Thus can we safely assume that state is used as an event handler when the ref is a prop?
          // Normally we can't warn about that because we don't know what the event handler does externally.
          // But when it's a prop, it's internal.
          // I guess it could still be valid when the dep is external state? Or in that case,
          // the issue is the state should be lifted to the parent?
          if (isPropRef(context, ref) && callExpr.arguments.length > 0) {
            context.report({
              node: callExpr,
              messageId: "avoidPassingStateToParent",
            });
          }
        });
    },
  }),
};
