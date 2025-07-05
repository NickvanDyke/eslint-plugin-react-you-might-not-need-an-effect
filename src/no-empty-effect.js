import { isUseEffect, getEffectFnRefs } from "./util/react.js";

export const name = "no-empty-effect";
export const messages = {
  avoidEmptyEffect: "avoidEmptyEffect",
};
export const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow empty React effects.",
    },
    schema: [],
    messages: {
      [messages.avoidEmptyEffect]: "This effect is empty and could be removed.",
    },
  },
  create: (context) => ({
    CallExpression: (node) => {
      if (!isUseEffect(node)) return;
      const effectFnRefs = getEffectFnRefs(context, node);

      if (effectFnRefs?.length === 0) {
        // Hopefully it's obvious the effect can be removed.
        // More a follow-up for once they fix/remove other issues.
        context.report({
          node,
          messageId: messages.avoidEmptyEffect,
        });
      }
    },
  }),
};
