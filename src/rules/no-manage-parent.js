import {
  getEffectFnRefs,
  getEffectDepsRefs,
  isUseEffect,
  getUpstreamRefs,
} from "../util/ast.js";
import { isProp } from "../util/ast.js";

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
      if (!isUseEffect(node)) return;
      const effectFnRefs = getEffectFnRefs(context, node);
      const depsRefs = getEffectDepsRefs(context, node);
      if (!effectFnRefs || !depsRefs) return;

      if (effectFnRefs.length === 0) return;

      const isAllProps = effectFnRefs
        .concat(depsRefs)
        .flatMap((ref) => getUpstreamRefs(context, ref))
        .notEmptyEvery((ref) => isProp(ref));

      if (isAllProps) {
        context.report({
          node,
          messageId: "avoidManagingParent",
        });
      }
    },
  }),
};
