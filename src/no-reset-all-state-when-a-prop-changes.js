import { getCallExpr, traverse } from "./util/ast.js";
import {
  isUseEffect,
  getEffectFnRefs,
  getDependenciesRefs,
  isStateSetter,
  isProp,
  getUseStateNode,
  isUseState,
  isReactFunctionalComponent,
  isReactFunctionalHOC,
  isCustomHook,
} from "./util/react.js";

export const name = "no-reset-all-state-when-a-prop-changes";
export const messages = {
  avoidResettingAllStateWhenAPropChanges:
    "avoidResettingAllStateWhenAPropChanges",
};
export const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow resetting all state in an effect when a prop changes.",
      url: "https://react.dev/learn/you-might-not-need-an-effect#resetting-all-state-when-a-prop-changes",
    },
    schema: [],
    messages: {
      [messages.avoidResettingAllStateWhenAPropChanges]:
        'Avoid resetting all state when a prop changes. If "{{prop}}" is a key, pass it as `key` instead so React will reset the component.',
    },
  },
  create: (context) => ({
    CallExpression: (node) => {
      if (!isUseEffect(node)) return;
      const effectFnRefs = getEffectFnRefs(context, node);
      const depsRefs = getDependenciesRefs(context, node);
      if (!effectFnRefs || !depsRefs) return;

      const propUsedToResetAllState = findPropUsedToResetAllState(
        context,
        effectFnRefs,
        depsRefs,
        node,
      );

      if (propUsedToResetAllState) {
        context.report({
          node: node,
          messageId: messages.avoidResettingAllStateWhenAPropChanges,
          data: { prop: propUsedToResetAllState.identifier.name },
        });
      }
    },
  }),
};

const findPropUsedToResetAllState = (
  context,
  effectFnRefs,
  depsRefs,
  useEffectNode,
) => {
  const stateSetterRefs = effectFnRefs.filter((ref) =>
    isStateSetter(context, ref),
  );

  const isAllStateReset =
    stateSetterRefs.length > 0 &&
    stateSetterRefs.every((ref) => isSetStateToInitialValue(context, ref)) &&
    stateSetterRefs.length ===
      countUseStates(context, findContainingNode(useEffectNode));

  return isAllStateReset
    ? depsRefs.find((ref) => isProp(context, ref))
    : undefined;
};

const isSetStateToInitialValue = (context, setterRef) => {
  const setStateToValue = getCallExpr(setterRef).arguments[0];
  const stateInitialValue = getUseStateNode(context, setterRef).init
    .arguments[0];

  // `useState()` (with no args) defaults to `undefined`,
  // so ommitting the arg is equivalent to passing `undefined`.
  // Technically this would false positive if they shadowed
  // `undefined` in only one of the scopes (only possible via `var`),
  // but I hope no one would do that.
  const isUndefined = (node) => node === undefined || node.name === "undefined";
  if (isUndefined(setStateToValue) && isUndefined(stateInitialValue)) {
    return true;
  }

  // `sourceCode.getText()` returns the entire file when passed null/undefined - let's short circuit that
  if (setStateToValue === null && stateInitialValue === null) {
    return true;
  } else if (
    (setStateToValue && !stateInitialValue) ||
    (!setStateToValue && stateInitialValue)
  ) {
    return false;
  }

  return (
    context.sourceCode.getText(setStateToValue) ===
    context.sourceCode.getText(stateInitialValue)
  );
};

const countUseStates = (context, componentNode) => {
  let count = 0;

  traverse(context, componentNode, (node) => {
    if (isUseState(node)) {
      count++;
    }
  });

  return count;
};

// Returns the component or custom hook that contains the `useEffect` node
const findContainingNode = (node) => {
  if (!node) {
    return undefined;
  } else if (
    isReactFunctionalComponent(node) ||
    isReactFunctionalHOC(node) ||
    isCustomHook(node)
  ) {
    return node;
  } else {
    return findContainingNode(node.parent);
  }
};
