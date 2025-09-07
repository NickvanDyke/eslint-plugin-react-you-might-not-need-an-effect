import { getEffectFnRefs, getEffectDepsRefs } from "./util/react.js";
import { isProp } from "./util/react.js";

/**
 * @type {import("eslint").Rule.RuleModule}
 */
export default {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow effects that only use props.",
    },
    schema: [],
    messages: {
      avoidManagingParent:
        "This effect only uses props. Consider lifting the logic up to the parent.",
    },
  },
  create: (context) => ({
    CallExpression: (node) => {
      const effectFnRefs = getEffectFnRefs(context, node);
      const depsRefs = getEffectDepsRefs(context, node);
      if (!effectFnRefs || !depsRefs) return;

      if (effectFnRefs.length === 0) return;

      if (effectFnRefs.concat(depsRefs).every((ref) => isProp(context, ref))) {
        context.report({
          node,
          messageId: "avoidManagingParent",
        });
      }
    },
  }),
};
