import {
  traverse,
  getUpstreamVariables,
  getDownstreamRefs,
  getCallExpr,
  isIIFE,
} from "./ast.js";

export const isReactFunctionalComponent = (node) =>
  (node.type === "FunctionDeclaration" ||
    (node.type === "VariableDeclarator" &&
      (node.init.type === "ArrowFunctionExpression" ||
        node.init.type === "CallExpression"))) &&
  node.id.type === "Identifier" &&
  node.id.name[0].toUpperCase() === node.id.name[0];

// NOTE: Returns false for known pure HOCs -- `memo` and `forwardRef`.
// TODO: Will not detect when they define the component normally and then export it wrapped in the HOC.
// e.g. `const MyComponent = (props) => {...}; export default memo(MyComponent);`
export const isReactFunctionalHOC = (node) =>
  node.type === "VariableDeclarator" &&
  node.init &&
  node.init.type === "CallExpression" &&
  node.init.callee.type === "Identifier" &&
  !["memo", "forwardRef"].includes(node.init.callee.name) &&
  node.init.arguments.length > 0 &&
  (node.init.arguments[0].type === "ArrowFunctionExpression" ||
    node.init.arguments[0].type === "FunctionExpression") &&
  node.id.type === "Identifier" &&
  node.id.name[0].toUpperCase() === node.id.name[0];

export const isCustomHook = (node) =>
  (node.type === "FunctionDeclaration" ||
    (node.type === "VariableDeclarator" &&
      node.init &&
      (node.init.type === "ArrowFunctionExpression" ||
        node.init.type === "FunctionExpression"))) &&
  node.id.type === "Identifier" &&
  node.id.name.startsWith("use") &&
  node.id.name[3] === node.id.name[3].toUpperCase();

export const isUseState = (node) =>
  node.type === "VariableDeclarator" &&
  node.init &&
  node.init.type === "CallExpression" &&
  node.init.callee.name === "useState" &&
  node.id.type === "ArrayPattern" &&
  // Not sure its usecase, but may just have the setter
  (node.id.elements.length === 1 || node.id.elements.length === 2) &&
  node.id.elements.every((el) => {
    // Apparently skipping the state element is a valid use.
    // I suppose technically the state can still be read via setter callback.
    return !el || el.type === "Identifier";
  });

export const isUseRef = (node) =>
  node.type === "VariableDeclarator" &&
  node.init &&
  node.init.type === "CallExpression" &&
  node.init.callee.name === "useRef" &&
  node.id.type === "Identifier";

export const isUseEffect = (node) =>
  node.type === "CallExpression" &&
  ((node.callee.type === "Identifier" &&
    (node.callee.name === "useEffect" ||
      node.callee.name === "useLayoutEffect")) ||
    (node.callee.type === "MemberExpression" &&
      node.callee.object.name === "React" &&
      (node.callee.property.name === "useEffect" ||
        node.callee.property.name === "useLayoutEffect")));

export const getEffectFn = (node) => {
  if (!isUseEffect(node) || node.arguments.length < 1) {
    return undefined;
  }

  const effectFn = node.arguments[0];
  if (
    effectFn.type !== "ArrowFunctionExpression" &&
    effectFn.type !== "FunctionExpression"
  ) {
    return undefined;
  }

  return effectFn;
};

// NOTE: When `MemberExpression` (even nested ones), a `Reference` is only the root object, not the function.
export const getEffectFnRefs = (context, node) => {
  const effectFn = getEffectFn(node);
  if (!effectFn) {
    return null;
  }

  return getDownstreamRefs(context, effectFn);
};

export function getDependenciesRefs(context, node) {
  if (!isUseEffect(node) || node.arguments.length < 2) {
    return undefined;
  }

  const depsArr = node.arguments[1];
  if (depsArr.type !== "ArrayExpression") {
    return undefined;
  }

  return getDownstreamRefs(context, depsArr);
}

export const isFnRef = (ref) => getCallExpr(ref) !== undefined;

// NOTE: These return true for state with CallExpressions, like `list.concat()`.
// Arguably preferable, as mutating the state is functionally the same as calling the setter.
// (Even though that is not recommended and should be prevented by a different rule).
// And in the case of a prop, we can't differentiate state mutations from callbacks anyway.
export const isStateSetter = (context, ref) =>
  isFnRef(ref) &&
  getUpstreamReactVariables(context, ref.resolved).notEmptyEvery((variable) =>
    isState(variable),
  );
export const isPropCallback = (context, ref) =>
  isFnRef(ref) &&
  getUpstreamReactVariables(context, ref.resolved).notEmptyEvery((variable) =>
    isProp(variable),
  );

// NOTE: Global variables (like `JSON` in `JSON.stringify()`) have an empty `defs`; fortunately `[].some() === false`.
// Also, I'm not sure so far when `defs.length > 1`... haven't seen it with shadowed variables or even redeclared variables with `var`.
export const isState = (variable) =>
  variable.defs.some((def) => isUseState(def.node));
export const isRef = (variable) =>
  variable.defs.some((def) => isUseRef(def.node));
export const isProp = (variable) =>
  variable.defs.some(
    (def) =>
      def.type === "Parameter" &&
      (isReactFunctionalComponent(getDeclNode(def.node)) ||
        isCustomHook(getDeclNode(def.node))),
  );
export const isHOCProp = (variable) =>
  variable.defs.some(
    (def) =>
      def.type === "Parameter" && isReactFunctionalHOC(getDeclNode(def.node)),
  );

const getDeclNode = (node) =>
  node.type === "ArrowFunctionExpression"
    ? node.parent.type === "CallExpression"
      ? node.parent.parent
      : node.parent
    : node;

export const getUseStateNode = (context, ref) => {
  return getUpstreamReactVariables(context, ref.resolved)
    .find((variable) => isState(variable))
    ?.defs.find((def) => isUseState(def.node))?.node;
};

// Returns true if the node is called directly inside a `useEffect`.
// Note IIFEs do not break the "direct" chain because they're invoked immediately, as opposed to being a callback.
// Non-direct calls are likely inside a callback passed to an external system like `window.addEventListener`,
// or a Promise chain that (probably) retrieves external data.
// Note we'll still analyze derived setters because isStateSetter considers that.
// Heuristic inspired by https://eslint-react.xyz/docs/rules/hooks-extra-no-direct-set-state-in-use-effect
export const isDirectCall = (node) => {
  if (!node) {
    return false;
  } else if (
    (node.type === "ArrowFunctionExpression" ||
      node.type === "FunctionExpression") &&
    !isIIFE(node.parent)
  ) {
    return isUseEffect(node.parent);
  } else {
    return isDirectCall(node.parent);
  }
};

export const findPropUsedToResetAllState = (
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
    ? depsRefs.find((ref) => isProp(ref.resolved))
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

export const countCalls = (ref) =>
  ref.resolved.references.filter(
    (ref) => ref.identifier.parent.type === "CallExpression",
  ).length;

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

export const getUpstreamReactVariables = (context, variable) =>
  getUpstreamVariables(
    context,
    variable,
    // Stop at the *usage* of `useState` - don't go up to the `useState` variable.
    // Not needed for props - they don't go "too far".
    // We could remove this and check for the `useState` variable instead,
    // but then all our tests need to import it so we can traverse up to it.
    // And would need to change `getUseStateNode()` too?
    // TODO: Could probably organize these filters better.
    (node) => !isUseState(node),
  ).filter(
    (variable) =>
      isProp(variable) ||
      variable.defs.every((def) => def.type !== "Parameter"),
  );
