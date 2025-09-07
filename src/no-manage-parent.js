import {
  isUseEffect,
  getEffectFnRefs,
  getDependenciesRefs,
} from "./util/react.js";
import { isProp } from "./util/react.js";

export const name = "no-manage-parent";
export const messages = {
  avoidManagingParent: "avoidManagingParent",
};
export const rule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow effects that only use props.",
    },
    schema: [],
    messages: {
      [messages.avoidManagingParent]:
        "This effect only uses props. Consider lifting the logic up to the parent.",
    },
  },
  create: (context) => ({
    CallExpression: (node) => {
      if (!isUseEffect(node)) return;
      const effectFnRefs = getEffectFnRefs(context, node);
      const depsRefs = getDependenciesRefs(context, node);
      if (!effectFnRefs || !depsRefs) return;

      if (effectFnRefs.length === 0) return;

      if (effectFnRefs.concat(depsRefs).every((ref) => isProp(context, ref))) {
        context.report({
          node,
          messageId: messages.avoidManagingParent,
        });
      }
    },
  }),
};
