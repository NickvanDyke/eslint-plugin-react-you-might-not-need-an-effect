import {
  getEffectFnRefs,
  getEffectDepsRefs,
  hasCleanup,
  isUseEffect,
  getUpstreamRefs,
} from "../util/ast.js";
import { findDownstreamNodes, getDownstreamRefs } from "../util/ast.js";
import { isState } from "../util/ast.js";

/**
 * @type {import("eslint").Rule.RuleModule}
 */
export default {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow using state and an effect as an event handler.",
      url: "https://react.dev/learn/you-might-not-need-an-effect#sharing-logic-between-event-handlers",
    },
    schema: [],
    messages: {
      avoidEventHandler:
        "Avoid using state and effects as an event handler. Instead, call the event handling code directly when the event occurs.",
    },
  },
  create: (context) => ({
    CallExpression: (node) => {
      if (!isUseEffect(node) || hasCleanup(node)) return;
      const effectFnRefs = getEffectFnRefs(context, node);
      const depsRefs = getEffectDepsRefs(context, node);
      if (!effectFnRefs || !depsRefs) return;

      // TODO: Can we also flag this when the deps are internal, and the body calls internal stuff?
      // That'd overlap with other rules though... maybe just useRefs?

      findDownstreamNodes(context, node, "IfStatement")
        .filter((ifNode) => !ifNode.alternate)
        .filter((ifNode) =>
          getDownstreamRefs(context, ifNode.test)
            .flatMap((ref) => getUpstreamRefs(context, ref))
            // TODO: Should flag props too, but maybe with a different message?
            .notEmptyEvery((ref) => isState(ref)),
        )
        .forEach((ifNode) => {
          context.report({
            node: ifNode.test,
            messageId: "avoidEventHandler",
          });
        });
    },
  }),
};
