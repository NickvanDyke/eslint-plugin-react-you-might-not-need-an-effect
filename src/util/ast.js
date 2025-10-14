import { findVariable } from "eslint-utils";

/**
 * @import {Scope} from 'eslint'
 * @import {Rule} from 'eslint'
 * @import {AST} from 'eslint'
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
