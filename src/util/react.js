import { getCallExpr, getDownstreamRefs, getUpstreamRefs } from "./ast.js";

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
 * @param {Scope.Reference} ref
 * @returns {boolean}
 */
export const isState = (ref) =>
  ref.resolved?.defs.some(
    (def) =>
      def.node.type === "VariableDeclarator" &&
      def.node.id.type === "ArrayPattern" &&
      (def.node.id.elements.length === 1 ||
        def.node.id.elements.length === 2) &&
      def.node.id.elements[0]?.type === "Identifier" &&
      def.node.id.elements[0].name === ref.identifier.name,
  );

/**
 * @param {Scope.Reference} ref
 * @returns {boolean}
 */
export const isStateSetter = (ref) =>
  ref.resolved?.defs.some(
    (def) =>
      def.node.type === "VariableDeclarator" &&
      def.node.id.type === "ArrayPattern" &&
      def.node.id.elements.length === 2 &&
      def.node.id.elements[1]?.type === "Identifier" &&
      def.node.id.elements[1].name === ref.identifier.name,
  );

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
export const isConstant = (ref) =>
  (ref.resolved?.defs ?? []).some(
    (def) =>
      (def.node.type === "VariableDeclarator" &&
        def.node.init?.type === "Literal") ||
      def.node.init?.type === "TemplateLiteral" ||
      def.node.init?.type === "ArrayExpression" ||
      def.node.init?.type === "ObjectExpression",
  );

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
 * @param {Scope.Reference} ref
 * @returns {boolean}
 */
export const isRef = (ref) =>
  ref.resolved?.defs.some(
    (def) =>
      def.node.type === "VariableDeclarator" &&
      def.node.init?.type === "CallExpression" &&
      ((def.node.init.callee.type === "Identifier" &&
        def.node.init.callee.name === "useRef") ||
        (def.node.init.callee.type === "MemberExpression" &&
          def.node.init.callee.object.name === "React" &&
          def.node.init.callee.property.name === "useRef")),
  );

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
 * @param {Rule.Node} node - The `useEffect` `CallExpression` node
 * @returns {Rule.Node | undefined}
 */
export const getEffectFn = (node) => {
  const effectFn = node.arguments[0];
  if (
    effectFn?.type !== "ArrowFunctionExpression" &&
    effectFn?.type !== "FunctionExpression"
  ) {
    return undefined;
  }

  return effectFn;
};

/**
 * @param {Rule.RuleContext} context
 * @param {Rule.Node} node - The `useEffect` `CallExpression` node
 * @returns {Scope.Reference[] | undefined}
 */
export const getEffectFnRefs = (context, node) => {
  const effectFn = getEffectFn(node);
  return effectFn ? getDownstreamRefs(context, effectFn) : undefined;
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

/**
 * @param {Rule.RuleContext} context
 * @param {Scope.Reference} ref
 * @param {(ref: Scope.Reference) => boolean} predicate
 * @returns {boolean} Whether this reference eventually calls a function matching the given predicate.
 */
const isEventualCallTo = (context, ref, predicate) =>
  // TODO: Should this be core to getUpstreamRefs?
  // For functions, only traverse up them when they're actually called (i.e. are CallExpressions)?
  // Not just referenced. But, seems rare to do that.
  // I think this needs some refinement/double-checking still.
  // But seems like an improvement nonetheless.
  getCallExpr(ref) !== undefined &&
  getUpstreamRefs(context, ref).some(
    // FIX: This misses when one reference is set exactly to another, and the former reference is called.
    // The predicate will fail on the former reference, and the latter reference (which would pass the predicate)
    // won't be checked because it's not a CallExpression itself.
    // But that's basically renaming the variable, which is probably rare enough to ignore for now.
    (ref) => getCallExpr(ref) !== undefined && predicate(ref),
  );

/**
 * @param {Rule.RuleContext} context
 * @param {Scope.Reference} ref
 * @returns {boolean} Whether this reference eventually calls a state setter function or a method on state.
 */
export const callsStateSetter = (context, ref) =>
  isEventualCallTo(context, ref, isStateSetter);

/**
 * @param {Rule.RuleContext} context
 * @param {Scope.Reference} ref
 * @returns {boolean} Whether this reference eventually calls a prop function or a method on a prop.
 */
export const callsProp = (context, ref) =>
  isEventualCallTo(context, ref, isProp);

/**
 * @param {Rule.RuleContext} context
 * @param {Scope.Reference} ref
 * @returns {boolean} Whether this reference eventually calls a method on a ref.
 */
export const callsRef = (context, ref) =>
  isEventualCallTo(context, ref, (ref) => isRefCurrent(ref) || isRef(ref));

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
