/**
 * @import {Scope,Rule} from 'eslint'
 */

/**
 * @param {Rule.Node} node
 * @returns {boolean}
 */
export const isReactFunctionalComponent = (node) =>
  (node.type === "FunctionDeclaration" ||
    (node.type === "VariableDeclarator" &&
      (node.init.type === "ArrowFunctionExpression" ||
        node.init.type === "CallExpression"))) &&
  node.id.type === "Identifier" &&
  node.id.name[0].toUpperCase() === node.id.name[0];

/**
 * Excludes known pure HOCs like `memo` and `forwardRef`.
 * Basically this is meant to detect custom HOCs that may have side effects, particularly when using their props.
 *
 * TODO: Will not detect when the component is defined normally and then exported wrapped in an HOC.
 * e.g. `const MyComponent = (props) => {...}; export default memo(MyComponent);`
 *
 * @param {Rule.Node} node
 * @returns {boolean}
 */
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

/**
 * @param {Rule.Node} node
 * @returns {boolean}
 */
export const isCustomHook = (node) =>
  (node.type === "FunctionDeclaration" ||
    (node.type === "VariableDeclarator" &&
      node.init &&
      (node.init.type === "ArrowFunctionExpression" ||
        node.init.type === "FunctionExpression"))) &&
  node.id.type === "Identifier" &&
  node.id.name.startsWith("use") &&
  node.id.name[3] === node.id.name[3].toUpperCase();

/**
 * @param {Scope.Reference} ref
 * @returns {boolean}
 */
export const isUseState = (ref) =>
  (ref.identifier.type === "Identifier" &&
    ref.identifier.name === "useState") ||
  (ref.identifier.parent.type === "MemberExpression" &&
    ref.identifier.parent.object.name === "React" &&
    ref.identifier.parent.property.name === "useState");

/**
 * Returns false for props of HOCs (e.g. `withRouter`) because they usually have side effects.
 *
 * @param {Scope.Reference} ref
 * @returns {boolean}
 */
export const isProp = (ref) =>
  ref.resolved?.defs.some((def) => {
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
  });

/**
 * @param {Scope.Reference} ref
 * @returns {boolean}
 */
export const isUseRef = (ref) =>
  (ref.identifier.type === "Identifier" && ref.identifier.name === "useRef") ||
  (ref.identifier.parent.type === "MemberExpression" &&
    ref.identifier.parent.object.name === "React" &&
    ref.identifier.parent.property.name === "useRef");

/**
 * Whether the reference's `current` property is being accessed.
 * Heuristic for whether the reference is a React ref object.
 * Because we don't always have access to the `useRef` call itself.
 * For example when receiving a ref from props.
 *
 * @param {Scope.Reference} ref
 * @returns {boolean}
 */
export const isRefCurrent = (ref) =>
  ref.identifier.parent.type === "MemberExpression" &&
  ref.identifier.parent.property.type === "Identifier" &&
  ref.identifier.parent.property.name === "current";

/**
 * Does not include `useLayoutEffect`.
 * When used correctly, it interacts with the DOM = external system = (probably) valid effect.
 * When used incorrectly, it's probably too difficult to accurately analyze anyway.
 *
 * @param {Rule.Node} node
 * @returns {boolean}
 */
export const isUseEffect = (node) =>
  node.type === "CallExpression" &&
  ((node.callee.type === "Identifier" && node.callee.name === "useEffect") ||
    (node.callee.type === "MemberExpression" &&
      node.callee.object.name === "React" &&
      node.callee.property.name === "useEffect"));

/**
 * @param {Rule.RuleContext} context
 * @param {Rule.Node} node - The `useEffect` `CallExpression` node
 * @returns {Scope.Reference[] | undefined}
 */
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

/**
 * @param {Rule.RuleContext} context
 * @param {Rule.Node} node - The `useEffect` `CallExpression` node
 * @returns {Scope.Reference[] | undefined}
 */
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
/**
 * @param {Rule.RuleContext} context
 * @param {Scope.Reference} ref
 * @returns {boolean}
 */
export const isStateSetter = (context, ref) =>
  getCallExpr(ref) !== undefined &&
  getUpstreamRefs(context, ref).some((ref) => isUseState(ref));
/**
 * @param {Rule.RuleContext} context
 * @param {Scope.Reference} ref
 * @returns {boolean}
 */
export const isPropCallback = (context, ref) =>
  getCallExpr(ref) !== undefined &&
  getUpstreamRefs(context, ref).some((ref) => isProp(ref));
/**
 * @param {Rule.RuleContext} context
 * @param {Scope.Reference} ref
 * @returns {boolean}
 */
export const isRefCall = (context, ref) =>
  getCallExpr(ref) !== undefined &&
  (isRefCurrent(ref) ||
    getUpstreamRefs(context, ref).some((ref) => isUseRef(ref)));

/**
 * @param context {Rule.RuleContext}
 * @param {Scope.Reference} ref
 * @returns {Rule.Node | undefined} The `VariableDeclarator` node of the `useState` call.
 */
export const getUseStateDecl = (context, ref) => {
  let node = getUpstreamRefs(context, ref).find((ref) =>
    isUseState(ref),
  )?.identifier;
  while (node && node.type !== "VariableDeclarator") {
    node = node.parent;
  }
  return node;
};

/**
 * Walks up the AST until a `useEffect` call, returning `false` if never found, or finds any of the following on the way:
 * - An `async` function
 * - A function declaration, which may be called at an arbitrary later time.
 *   - While we return false for *this* call, we may still return true for a call to a function containing this call. Combined with `getUpstreamRefs()`, it will still flag calls to the containing function.
 * - A function passed as a callback to another function or `new` - event handler, `setTimeout`, `Promise.then()` `new ResizeObserver()`, etc.
 *
 * Otherwise returns `true`.
 *
 * Inspired by https://eslint-react.xyz/docs/rules/hooks-extra-no-direct-set-state-in-use-effect
 *
 * @param {Rule.Node} node
 * @returns {boolean}
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
export const getUpstreamRefs = (context, ref, visited = new Set()) => {
  // TODO: Probably best to track this here but let the downstream `traverse()` handle it?
  // Especially if we can simplify/eliminate `getDownstreamRefs()` -> `findDownstreamNodes()` from the path.
  visited.add(ref);

  const upstreamRefs = ref.resolved?.defs
    // We have no analytical use for import statements; terminate at the previous reference (actually using the imported thing).
    .filter((def) => def.type !== "ImportBinding")
    // Don't traverse parameter definitions.
    // Their definition node is the function, so downstream would include the whole function body.
    .filter((def) => def.type !== "Parameter")
    // `def.node.init` is for ArrowFunctionExpression, VariableDeclarator, (etc?).
    // `def.node.body` is for FunctionDeclaration.
    .map((def) => def.node.init ?? def.node.body)
    .filter(Boolean)
    .flatMap((node) => getDownstreamRefs(context, node))
    // Prevent infinite recursion from circular references.
    .filter((ref) => !visited.has(ref))
    .flatMap((ref) => getUpstreamRefs(context, ref, visited));

  const isLeafRef =
    // Unresolvable references (e.g. missing imports, misconfigured globals).
    upstreamRefs === undefined ||
    // Actually terminal references (e.g. parameters, imports, globals).
    upstreamRefs.length === 0;

  return (
    // Mid-stream references are skipped in the ultimate return value.
    // We could concat `ref` if we want mid-stream references. Unsure.
    // It'd make edge-case handling easier because we don't need to so
    // carefully filter out things like pure function references to use `every`.
    // But may be less accurate for other use cases.
    // Maybe using `visited.length === 1` to detect the initial call if needed.
    isLeafRef ? [ref] : upstreamRefs
    // We don't care to analyze non-prop parameters.
    // They are local to the function and essentially duplicate the argument reference.
    // NOTE: Okay to return them while we use `some()` on the result.
    // .filter(
    //   (ref) =>
    //     isProp(ref) ||
    //     !ref.resolved ||
    //     ref.resolved.defs.some((def) => def.type !== "Parameter"),
    // )
  );
};

/**
 * @param {Rule.RuleContext} context
 * @param {Rule.Node} node
 * @param {(node: Rule.Node) => void} visit
 * @param {Set<Rule.Node>} visited
 */
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

/**
 * @param {Rule.RuleContext} context
 * @param {Rule.Node} topNode
 * @param {string} type
 */
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

/**
 * @param {Rule.RuleContext} context
 * @param {Rule.Node} identifier
 *
 * @returns {Scope.Reference | undefined}
 */
const getRef = (context, identifier) =>
  context.sourceCode
    .getScope(identifier)
    ?.references.find((ref) => ref.identifier == identifier);

/**
 * @param {Scope.Reference} ref
 * @param {Rule.Node} current
 * @returns {Rule.Node | undefined}
 */
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

/**
 * While it *could* be an anti-pattern or unnecessary, effects *are* meant to synchronize systems.
 * So we presume that a "subscription effect" is usually valid, or at least may be more readable.
 *
 * TODO: We might be able to use this more granularly, e.g. ignore state setters inside a subscription effect,
 * instead of ignoring the whole effect...? But it'd have to be more complicated, like also ignore the same state setters called in the body.
 *
 * @param {Rule.Node} node - The `useEffect` `CallExpression` node
 * @returns {boolean}
 */
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
