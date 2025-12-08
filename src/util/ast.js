/**
 * @import {Scope,Rule} from 'eslint'
 */

/**
 * Get all terminal references that ultimately flow into `ref`.
 *
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
const getRef = (context, identifier) =>
  context.sourceCode
    .getScope(identifier)
    ?.references.find((ref) => ref.identifier == identifier);
