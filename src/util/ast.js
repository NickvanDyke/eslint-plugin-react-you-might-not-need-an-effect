import { findVariable } from "eslint-utils";

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

export const getUpstreamVariables = (
  context,
  node,
  filter,
  visited = new Set(),
) => {
  if (visited.has(node)) {
    return [];
  }

  visited.add(node);

  const variable = findVariable(context.sourceCode.getScope(node), node);
  if (!variable) {
    // I think this only happens when:
    // 1. There's genuinely no variable, i.e. `node` is a literal
    // 2. Import statement is missing
    // 3. ESLint globals are misconfigured
    return [];
  }

  const upstreamVariables = variable.defs
    .filter((def) => !!def.node.init)
    .filter((def) => filter(def.node))
    .flatMap((def) => findDownstreamNodes(context, def.node.init, "Identifier"))
    .flatMap((identifier) =>
      getUpstreamVariables(context, identifier, filter, visited),
    );

  // Ultimately return only leaf variables
  return upstreamVariables.length === 0 ? [variable] : upstreamVariables;
};

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

export const isIIFE = (node) =>
  node.type === "CallExpression" &&
  (node.callee.type === "ArrowFunctionExpression" ||
    node.callee.type === "FunctionExpression");
