/**
 * @import {Scope,Rule} from 'eslint'
 */

/**
 * Get all references that ultimately flow into `ref`.
 *
 * @param {Rule.RuleContext} context
 * @param {Scope.Reference} ref
 * @param {"leaf" | "all"} [mode="all"]
 * @param {Set<Scope.Reference>} visited
 *
 * @returns {Scope.Reference[]}
 */
export const getUpstreamRefs = (
  context,
  ref,
  mode = "all",
  visited = new Set(),
) => {
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
    .flatMap((ref) => getUpstreamRefs(context, ref, mode, visited));

  const isLeafRef =
    // Unresolvable references (e.g. missing imports, misconfigured globals).
    upstreamRefs === undefined ||
    // Actually terminal references (e.g. parameters, imports, globals).
    upstreamRefs.length === 0;

  return mode === "leaf"
    ? isLeafRef
      ? [ref]
      : upstreamRefs
    : [ref].concat(upstreamRefs ?? []);
  // We don't care to analyze non-prop parameters.
  // They are local to the function and essentially duplicate the argument reference.
  // NOTE: Okay to return them while we use `some()` on the result.
  // .filter(
  //   (ref) =>
  //     isProp(ref) ||
  //     !ref.resolved ||
  //     ref.resolved.defs.some((def) => def.type !== "Parameter"),
  // )
};

/**
 * Descend the AST from `node`, calling `visit` on each node.
 *
 * @param {Rule.RuleContext} context
 * @param {Rule.Node} node
 * @param {(node: Rule.Node) => void} visit
 * @param {Set<Rule.Node>} visited
 */
export const descend = (context, node, visit, visited = new Set()) => {
  if (visited.has(node)) {
    return;
  }
  visit(node);
  visited.add(node);

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
    .forEach((child) => descend(context, child, visit, visited));
};

/**
 * @param {Rule.RuleContext} context
 * @param {Rule.Node} topNode
 * @param {string} type
 */
export const findDownstreamNodes = (context, topNode, type) => {
  const nodes = [];
  descend(context, topNode, (node) => {
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
 * When using this, we assume that args passed to the derived function are always eventually passed to underlying functions.
 * Which they may not be. Would be better to trace the actual flow of values, but that's complex. We'll start with this for now.
 *
 * @param {Rule.RuleContext} context
 * @param {Scope.Reference} ref
 * @param {"leaf" | "all"} [mode="all"] Whether to return all refs, or only leaf refs. Note that "all" includes `ref` itself.
 * @returns {Rule.Node[]}
 */
export const getArgsUpstreamRefs = (context, ref, mode) =>
  getUpstreamRefs(context, ref, mode)
    .map((ref) => getCallExpr(ref))
    .filter(Boolean)
    .flatMap((callExpr) => callExpr.arguments)
    .flatMap((arg) => getDownstreamRefs(context, arg))
    .flatMap((ref) => getUpstreamRefs(context, ref));

/**
 * Walks up the AST until `within` (returns `true`) or finding any of (returns `false`):
 * - An `async` function
 * - A function declaration, which may be called at an arbitrary later time.
 *   - While we return false for *this* call, we may still return true for a call to a function containing this call. Combined with `getUpstreamRefs()`, it will still flag calls to the containing function.
 * - A function passed as a callback to another function or `new` - event handler, `setTimeout`, `Promise.then()` `new ResizeObserver()`, etc.
 *
 * Inspired by https://eslint-react.xyz/docs/rules/hooks-extra-no-direct-set-state-in-use-effect
 *
 * @param {Rule.Node} node
 * @param {Rule.Node} within
 * @returns {boolean}
 */
export const isSynchronous = (node, within) => {
  if (node == within) {
    // Reached the top without finding any blocking conditions
    return true;
  } else if (
    // Obviously not immediate if async. I think this never occurs in isolation from the below conditions? But just in case for now.
    node.async ||
    // Present when calling externally-defined async functions (`node.async` is only true on the function definition).
    // We'll play it safe and assume that any state, props, etc. used in this function or its upstreams may be used asynchronously.
    node.type === "AwaitExpression" ||
    (node.type === "UnaryExpression" && node.operator === "void") ||
    // Inside a named or anonymous function that may be called later, either as a callback or by the developer.
    node.type === "FunctionDeclaration" ||
    node.type === "FunctionExpression" ||
    node.type === "ArrowFunctionExpression"
  ) {
    return false;
  } else {
    // Keep going up
    return isSynchronous(node.parent, within);
  }
};

/**
 * @param {Rule.RuleContext} context
 * @param {Rule.Node} identifier
 *
 * @returns {Scope.Reference | undefined}
 */
export const getRef = (context, identifier) =>
  context.sourceCode
    .getScope(identifier)
    ?.references.find((ref) => ref.identifier == identifier);

/**
 * @param {Rule.RuleContext} context
 * @param {Scope.Reference} ref
 * @param {(ref: Scope.Reference) => boolean} predicate
 * @returns {boolean} Whether this reference eventually calls a function matching the given predicate.
 */
export const isEventualCallTo = (context, ref, predicate) =>
  getCallExpr(ref) !== undefined &&
  getUpstreamRefs(context, ref).some(predicate);
