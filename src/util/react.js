import { getUpstreamVariables, getDownstreamRefs, getCallExpr } from "./ast.js";

export const isReactFunctionalComponent = (node) =>
  (node.type === "FunctionDeclaration" ||
    (node.type === "VariableDeclarator" &&
      (node.init.type === "ArrowFunctionExpression" ||
        node.init.type === "CallExpression"))) &&
  node.id.type === "Identifier" &&
  node.id.name[0].toUpperCase() === node.id.name[0];

// NOTE: Returns false for known pure HOCs -- `memo` and `forwardRef`.
// Basically this is meant to detect custom HOCs that may have side effects, particularly when using their props.
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

// While it *could* be an anti-pattern or unnecessary, effects *are* meant to synchronize systems.
// So we presume that a "subscription effect" is usually valid, or at least may be more readable.
// TODO: We might be able to use this more granularly, e.g. ignore state setters inside a subscription effect,
// instead of ignoring the whole effect...? But it'd have to be more complicated, like also ignore the same state setters called in the body.
export const hasCleanup = (node) => {
  const effectFn = node.arguments[0];
  return (
    (effectFn.type === "ArrowFunctionExpression" ||
      effectFn.type === "FunctionExpression") &&
    effectFn.body.type === "BlockStatement" &&
    effectFn.body.body.some(
      (stmt) => stmt.type === "ReturnStatement" && stmt.argument,
    )
  );
};

export const isPropDef = (def) => {
  const declaringNode =
    def.node.type === "ArrowFunctionExpression"
      ? def.node.parent.type === "CallExpression"
        ? def.node.parent.parent
        : def.node.parent
      : def.node;
  return (
    def.type === "Parameter" &&
    ((isReactFunctionalComponent(declaringNode) &&
      !isReactFunctionalHOC(declaringNode)) ||
      isCustomHook(declaringNode))
  );
};

export const isUseRef = (node) =>
  node.type === "VariableDeclarator" &&
  node.init &&
  node.init.type === "CallExpression" &&
  node.init.callee.name === "useRef" &&
  node.id.type === "Identifier";

// NOTE: Does not include `useLayoutEffect`.
// When used correctly, it interacts with the DOM = external system = (probably) valid effect.
// When used incorrectly, it's probably too difficult to accurately analyze anyway.
export const isUseEffect = (node) =>
  node.type === "CallExpression" &&
  ((node.callee.type === "Identifier" && node.callee.name === "useEffect") ||
    (node.callee.type === "MemberExpression" &&
      node.callee.object.name === "React" &&
      node.callee.property.name === "useEffect"));

// NOTE: When `MemberExpression` (even nested ones), a `Reference` is only the root object, not the function.
export const getEffectFnRefs = (context, node) => {
  const effectFn = node.arguments[0];
  if (
    effectFn?.type !== "ArrowFunctionExpression" &&
    effectFn?.type !== "FunctionExpression"
  ) {
    return undefined;
  }

  return getDownstreamRefs(context, effectFn);
};

export function getEffectDepsRefs(context, node) {
  const depsArr = node.arguments[1];
  if (depsArr?.type !== "ArrayExpression") {
    return undefined;
  }

  return getDownstreamRefs(context, depsArr);
}

// NOTE: These return true for MemberExpressions *on* state, like `list.concat()`.
// Arguably preferable, as mutating the state is functionally the same as calling the setter.
// (Even though that is not recommended and should be prevented by a different rule).
// And in the case of a prop, we can't differentiate state mutations from callbacks anyway.
export const isStateSetter = (context, ref) =>
  getCallExpr(ref) !== undefined && isState(context, ref);
export const isPropCallback = (context, ref) =>
  getCallExpr(ref) !== undefined && isProp(context, ref);

// NOTE: Global variables (like `JSON` in `JSON.stringify()`) have an empty `defs`; fortunately `[].some() === false`.
// Also, I'm not sure so far when `defs.length > 1`... haven't seen it with shadowed variables or even redeclared variables with `var`.
export const isState = (context, ref) =>
  getUpstreamReactVariables(context, ref.resolved).notEmptyEvery((variable) =>
    variable.defs.some((def) => isUseState(def.node)),
  );
// Returns false for props of HOCs like `withRouter` because they usually have side effects.
export const isProp = (context, ref) =>
  getUpstreamReactVariables(context, ref.resolved).notEmptyEvery((variable) =>
    variable.defs.some((def) => isPropDef(def)),
  );
export const isRef = (context, ref) =>
  getUpstreamReactVariables(context, ref.resolved).notEmptyEvery((variable) =>
    variable.defs.some((def) => isUseRef(def.node)),
  );

// TODO: Surely can be simplified/re-use other functions.
// Needs a better API too so we can more easily get names etc. for messages.
export const getUseStateNode = (context, ref) => {
  return getUpstreamReactVariables(context, ref.resolved)
    .find((variable) => variable.defs.some((def) => isUseState(def.node)))
    ?.defs.find((def) => isUseState(def.node))?.node;
};

/**
 * Walks up the AST until a `useEffect` call, returning `false` if never found, or finds any of the following on the way:
 * - An async function
 * - A function declaration, which may be called at an arbitrary later time
 * - A function passed as a callback to another function or `new` - event handler, `setTimeout`, `Promise.then()` `new ResizeObserver()`, etc.
 *
 * Otherwise returns `true`.
 *
 * Inspired by https://eslint-react.xyz/docs/rules/hooks-extra-no-direct-set-state-in-use-effect
 */
export const isImmediateCall = (node) => {
  if (!node.parent) {
    // Reached the top of the program without finding a `useEffect`
    return false;
  } else if (isUseEffect(node.parent)) {
    return true;
  } else if (
    // Obviously not immediate if async. I think this never occurs in isolation from the below conditions? But just in case for now.
    node.async ||
    // Inside a named or anonymous function that may be called later, either as a callback or by the developer.
    // Note while we return false for *this* call, we may still return true for a call to the function containing this call.
    node.type === "FunctionDeclaration" ||
    node.type === "FunctionExpression" ||
    node.type === "ArrowFunctionExpression"
  ) {
    return false;
  } else {
    // Keep going up
    return isImmediateCall(node.parent);
  }
};

export const isArgsAllLiterals = (context, callExpr) =>
  callExpr.arguments
    .flatMap((arg) => getDownstreamRefs(context, arg))
    .flatMap((ref) => getUpstreamReactVariables(context, ref.resolved))
    .length === 0;

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
  ).filter((variable) =>
    variable.defs.every(
      (def) =>
        isPropDef(def) ||
        // Ignore variables declared inside an anonymous function, like in `array.map()`.
        def.type !== "Parameter",
    ),
  );
