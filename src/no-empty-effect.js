import { isUseEffect, getEffectFnRefs } from "./util/react.js";

/**
 * @type {import("eslint").Rule.RuleModule}
 */
export default {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow empty effects.",
    },
    schema: [],
    messages: {
      avoidEmptyEffect: "This effect is empty and could be removed.",
    },
  },
  create: (context) => ({
    CallExpression: (node) => {
      if (!isUseEffect(node)) return;

      if (
        node.arguments?.length === 0 ||
        getEffectFnRefs(context, node)?.length === 0
      ) {
        // Hopefully it's obvious the effect can be removed.
        // More a follow-up for once they fix/remove other issues.
        context.report({
          node,
          messageId: "avoidEmptyEffect",
        });
      }
    },
  }),
};
