import { getCallExpr, traverse } from "../util/ast.js";
import {
  getEffectFnRefs,
  getEffectDepsRefs,
  isStateSetter,
  isProp,
  getUseStateNode,
  isUseState,
  isReactFunctionalComponent,
  isReactFunctionalHOC,
  isCustomHook,
  isUseEffect,
} from "../util/ast.js";

/**
 * @type {import("eslint").Rule.RuleModule}
 */
export default {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow resetting all state in an effect when a prop changes.",
      url: "https://react.dev/learn/you-might-not-need-an-effect#resetting-all-state-when-a-prop-changes",
    },
    schema: [],
    messages: {
      avoidResettingAllStateWhenAPropChanges:
        'Avoid resetting all state when a prop changes. If "{{prop}}" is a key, pass it as `key` instead so React will reset the component.',
    },
  },
  create: (context) => ({
    CallExpression: (node) => {
      if (!isUseEffect(node)) return;
      const effectFnRefs = getEffectFnRefs(context, node);
      const depsRefs = getEffectDepsRefs(context, node);
      if (!effectFnRefs || !depsRefs) return;
      // Skip custom hooks because they can't receive `key` like components can.
      const containingNode = findContainingNode(node);
      if (containingNode && isCustomHook(containingNode)) return;

      const propUsedToResetAllState = findPropUsedToResetAllState(
        context,
        effectFnRefs,
        depsRefs,
        node,
      );

      if (propUsedToResetAllState) {
        context.report({
          node: node,
          messageId: "avoidResettingAllStateWhenAPropChanges",
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

  // TODO: This is one of the few times we compare just the immediate nodes,
  // not upstream variables - that seems pretty complicated here?
  // At the least, upstream functions would have to return literals for us to consider too, not just variables...
  return (
    context.sourceCode.getText(setStateToValue) ===
    context.sourceCode.getText(stateInitialValue)
  );
};

const countUseStates = (context, componentNode) => {
  if (!componentNode) {
    return 0;
  }

  let count = 0;

  traverse(context, componentNode, (node) => {
    // TODO: Could optimize by not descending into nested functions/components, since hooks must be at the top level.
    if (isUseState(node)) {
      count++;
    }
  });

  return count;
};

// Returns the component or custom hook that contains the `useEffect` node.
// WARNING: Per the `isReactFunctionalComponent` etc. internals, this will return undefined for some non-idiomatic component definitions.
// e.g. `function buildComponent(arg1, arg2) { return <div />; }`
// Not sure we can account for that without introducing false positives, and those are rare and arguably bad practice.
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
