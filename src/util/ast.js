import { findVariable } from "eslint-utils";

/**
 * @import {Scope} from 'eslint'
 * @import {Rule} from 'eslint'
 * @import {AST} from 'eslint'
 */

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
  getUpstreamRefs(context, ref).notEmptyEvery((ref) =>
    ref.resolved.defs.some((def) => isUseState(def.node)),
  );
// Returns false for props of HOCs like `withRouter` because they usually have side effects.
export const isProp = (context, ref) =>
  getUpstreamRefs(context, ref).notEmptyEvery((ref) =>
    ref.resolved.defs.some((def) => isPropDef(def)),
  );
export const isRef = (context, ref) =>
  getUpstreamRefs(context, ref).notEmptyEvery((ref) =>
    ref.resolved.defs.some((def) => isUseRef(def.node)),
  );

// TODO: Surely can be simplified/re-use other functions.
// Needs a better API too so we can more easily get names etc. for messages.
export const getUseStateNode = (context, ref) => {
  return getUpstreamRefs(context, ref)
    .map((ref) => ref.resolved)
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

/**
 * @param {Rule.RuleContext} context
 * @param {Scope.Reference} ref
 *
 * @returns {Scope.Reference[]}
 */
export const getUpstreamRefs = (context, ref) => {
  if (!ref.resolved) {
    // I think this only happens when:
    // 1. Import statement is missing
    // 2. ESLint globals are misconfigured
    return [];
  } else if (
    // Ignore function parameters references, aside from props.
    // They are self-contained and essentially duplicate the argument reference.
    ref.resolved.defs.every(
      (def) => def.type === "Parameter" && !isPropDef(def),
    )
  ) {
    return [];
  }

  const upstreamRefs = ref.resolved.defs
    // TODO: https://github.com/NickvanDyke/eslint-plugin-react-you-might-not-need-an-effect/issues/34
    // `init` covers for arrow functions; also needs `body` to descend into function declarations
    // But then for function parameters (including props), `def.node.body` is the body of the function that they belong to,
    // so we get *all* the downstream refs in it...
    // We only want to descend when we're traversing up the function itself; no its parameters.
    // Probably similar logic to in `getUpstreamReactVariables`.
    .filter((def) => !!def.node.init)
    // Stop before we get to `useState()` - we want references to the state and setter.
    // May not be necessary if we adapt the check in `isState()`?
    .filter((def) => !isUseState(def.node))
    .flatMap((def) => getDownstreamRefs(context, def.node.init))
    .flatMap((ref) => getUpstreamRefs(context, ref));

  // Ultimately return only leaf refs
  return upstreamRefs.length === 0 ? [ref] : upstreamRefs;
};

export const traverse = (context, node, visit, visited = new Set()) => {
  if (visited.has(node)) {
    return;
  }

  visited.add(node);
  visit(node);

  (context.sourceCode.visitorKeys[node.type] || [])
    .map((key) => node[key])
    // Some `visitorKeys` are optional, e.g. `IfStatement.alternate`.
    .filter(Boolean)
    // Can be an array, like `CallExpression.arguments`
    .flatMap((child) => (Array.isArray(child) ? child : [child]))
    // Can rarely be `null`, e.g. `ArrayPattern.elements[1]` when an element is skipped - `const [a, , b] = arr`
    .filter(Boolean)
    // Check it's a valid AST node
    .filter((child) => typeof child.type === "string")
    .forEach((child) => traverse(context, child, visit, visited));
};

export const findDownstreamNodes = (context, topNode, type) => {
  const nodes = [];
  traverse(context, topNode, (node) => {
    if (node.type === type) {
      nodes.push(node);
    }
  });
  return nodes;
};

/**
 * @param {Rule.RuleContext} context
 * @param {Rule.Node} node
 */
export const getDownstreamRefs = (context, node) =>
  findDownstreamNodes(context, node, "Identifier")
    .map((identifier) => getRef(context, identifier))
    .filter(Boolean);

const getRef = (context, identifier) =>
  findVariable(
    context.sourceCode.getScope(identifier),
    identifier,
  )?.references.find((ref) => ref.identifier === identifier);

export const getCallExpr = (ref, current = ref.identifier.parent) => {
  if (current.type === "CallExpression") {
    // We've reached the top - confirm that the ref is the (eventual) callee, as opposed to an argument.
    let node = ref.identifier;
    while (node.parent.type === "MemberExpression") {
      node = node.parent;
    }

    if (current.callee === node) {
      return current;
    }
  }

  if (current.type === "MemberExpression") {
    return getCallExpr(ref, current.parent);
  }

  return undefined;
};

export const isArgsAllLiterals = (context, callExpr) =>
  callExpr.arguments
    .flatMap((arg) => getDownstreamRefs(context, arg))
    .flatMap((ref) => getUpstreamRefs(context, ref)).length === 0;
