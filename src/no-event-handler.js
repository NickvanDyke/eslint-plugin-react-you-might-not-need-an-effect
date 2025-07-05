import {
  isUseEffect,
  getEffectFnRefs,
  getDependenciesRefs,
} from "./util/react.js";
import { findDownstreamNodes, getDownstreamRefs } from "./util/ast.js";
import { getUpstreamReactVariables, isState } from "./util/react.js";

export const name = "no-event-handler";
export const messages = {
  avoidEventHandler: "avoidEventHandler",
};
export const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow using state and an effect as an event handler.",
      url: "https://react.dev/learn/you-might-not-need-an-effect#sharing-logic-between-event-handlers",
    },
    schema: [],
    messages: {
      [messages.avoidEventHandler]:
        "Avoid using state and effects as an event handler. Instead, call the event handling code directly when the event occurs.",
    },
  },
  create: (context) => ({
    CallExpression: (node) => {
      if (!isUseEffect(node)) return;
      const effectFnRefs = getEffectFnRefs(context, node);
      const depsRefs = getDependenciesRefs(context, node);
      if (!effectFnRefs || !depsRefs) return;

      findDownstreamNodes(context, node, "IfStatement")
        .filter((ifNode) => !ifNode.alternate)
        .filter((ifNode) =>
          getDownstreamRefs(context, ifNode.test)
            .flatMap((ref) =>
              getUpstreamReactVariables(context, ref.identifier),
            )
            .notEmptyEvery((variable) => isState(variable)),
        )
        .forEach((ifNode) => {
          context.report({
            node: ifNode.test,
            messageId: messages.avoidEventHandler,
          });
        });
    },
  }),
};
