import { getCallExpr } from "./util/ast.js";
import {
  getEffectDepsRefs,
  getEffectFnRefs,
  getUseStateNode,
  isImmediateCall,
  isStateSetter,
  isUseEffect,
} from "./util/react.js";

/**
 * @type {import("eslint").Rule.RuleModule}
 */
export default {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow initializing state in an effect.",
    },
    schema: [],
    messages: {
      avoidInitializingState:
        'Avoid initializing state in an effect. Instead, pass "{{state}}"\'s initial value to its `useState`.',
    },
  },
  create: (context) => ({
    CallExpression: (node) => {
      if (!isUseEffect(node)) return;
      const effectFnRefs = getEffectFnRefs(context, node);
      const depsRefs = getEffectDepsRefs(context, node);
      if (!effectFnRefs || !depsRefs) return;

      // TODO: Should this length check account for the setter in the deps? exhaustive-deps doesn't warn one way or the other
      if (depsRefs.length > 0) return;

      effectFnRefs
        .filter((ref) => isStateSetter(context, ref))
        .filter((ref) => isImmediateCall(ref.identifier))
        .forEach((ref) => {
          const useStateNode = getUseStateNode(context, ref);
          const stateName = (
            useStateNode.id.elements[0] ?? useStateNode.id.elements[1]
          )?.name;

          context.report({
            node: getCallExpr(ref),
            messageId: "avoidInitializingState",
            data: { state: stateName },
          });
        });
    },
  }),
};
