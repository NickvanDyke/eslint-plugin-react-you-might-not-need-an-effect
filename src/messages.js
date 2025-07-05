export const messageIds = {
  avoidDerivedState: "avoidDerivedState",
  avoidInitializingState: "avoidInitializingState",
  avoidChainingState: "avoidChainingState",
  avoidParentChildCoupling: "avoidParentChildCoupling",
};

// TODO: Could include more info in messages, like the relevant node
export const messages = {
  [messageIds.avoidDerivedState]:
    'Avoid storing derived state. Compute "{{state}}" directly during render, optionally with `useMemo` if it\'s expensive.',
  [messageIds.avoidInitializingState]:
    'Avoid initializing state in an effect. Instead, pass "{{state}}"\'s initial value to its `useState`.',
  [messageIds.avoidChainingState]:
    "Avoid chaining state changes. When possible, update all relevant state simultaneously.",
  [messageIds.avoidParentChildCoupling]:
    "Avoid coupling parent behavior or state to a child component. Instead, lift shared logic or state up to the parent.",
};
