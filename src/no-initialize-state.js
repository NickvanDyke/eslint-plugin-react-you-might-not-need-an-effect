import { getCallExpr } from "./util/ast.js";
import {
  getEffectDepsRefs,
  getEffectFnRefs,
  getUseStateNode,
  isDirectCall,
  isStateSetter,
  isUseEffect,
} from "./util/react.js";

export const name = "no-initialize-state";
export const messages = {
  avoidInitializingState: "avoidInitializingState",
};
export const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow initializing state in an effect.",
    },
    schema: [],
    messages: {
      [messages.avoidInitializingState]:
        'Avoid initializing state in an effect. Instead, pass "{{state}}"\'s initial value to its `useState`.',
    },
  },
  create: (context) => ({
    CallExpression: (node) => {
      if (!isUseEffect(node)) return;
      const effectFnRefs = getEffectFnRefs(context, node);
      const depsRefs = getEffectDepsRefs(context, node);
      if (!effectFnRefs || !depsRefs) return;

      // TODO: Should this length check account for the setter in the deps?
      if (depsRefs.length > 0) return;

      effectFnRefs
        .filter((ref) => isStateSetter(context, ref))
        .filter((ref) => isDirectCall(ref.identifier))
        .forEach((ref) => {
          const useStateNode = getUseStateNode(context, ref);
          const stateName = (
            useStateNode.id.elements[0] ?? useStateNode.id.elements[1]
          )?.name;

          context.report({
            node: getCallExpr(ref),
            messageId: messages.avoidInitializingState,
            data: { state: stateName },
          });
        });
    },
  }),
};
