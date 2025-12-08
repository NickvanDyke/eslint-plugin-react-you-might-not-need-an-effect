import { getCallExpr, isSynchronous } from "../util/ast.js";
import {
  getEffectDepsRefs,
  getEffectFn,
  getEffectFnRefs,
  getUseStateDecl,
  isStateSetter,
  isUseEffect,
} from "../util/react.js";

/**
 * @type {import("eslint").Rule.RuleModule}
 */
export default {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow initializing state in an effect.",
      url: "https://tkdodo.eu/blog/avoiding-hydration-mismatches-with-use-sync-external-store",
    },
    schema: [],
    messages: {
      avoidInitializingState:
        'Avoid initializing state in an effect. Instead, initialize "{{state}}"\'s `useState()` with "{{arguments}}". For SSR hydration, prefer `useSyncExternalStore()`.',
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
        .filter((ref) => isSynchronous(ref.identifier, getEffectFn(node)))
        .forEach((ref) => {
          const callExpr = getCallExpr(ref);
          const useStateNode = getUseStateDecl(context, ref);
          const stateName = (
            useStateNode.id.elements[0] ?? useStateNode.id.elements[1]
          )?.name;
          const argumentText = callExpr.arguments[0]
            ? context.sourceCode.getText(callExpr.arguments[0])
            : "undefined";

          context.report({
            node: getCallExpr(ref),
            messageId: "avoidInitializingState",
            data: { state: stateName, arguments: argumentText },
          });
        });
    },
  }),
};
