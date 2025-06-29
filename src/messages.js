export const messageIds = {
  avoidEmptyEffect: "avoidEmptyEffect",
  avoidDerivedState: "avoidDerivedState",
  avoidInitializingState: "avoidInitializingState",
  avoidChainingState: "avoidChainingState",
  avoidParentChildCoupling: "avoidParentChildCoupling",
  avoidResettingStateFromProps: "avoidResettingStateFromProps",
  avoidEventHandler: "avoidEventHandler",
  // TODO: Possible to detect when `useSyncExternalStore` should be preferred?
};

// TODO: Could include more info in messages, like the relevant node
export const messages = {
  [messageIds.avoidEmptyEffect]: "This effect is empty and could be removed.",
  [messageIds.avoidDerivedState]:
    'Avoid storing derived state. Compute "{{state}}" directly during render, optionally with `useMemo` if it\'s expensive.',
  [messageIds.avoidInitializingState]:
    'Avoid initializing state in an effect. Instead, pass "{{state}}"\'s initial value to its `useState`.',
  [messageIds.avoidChainingState]:
    "Avoid chaining state changes. When possible, update all relevant state simultaneously.",
  [messageIds.avoidParentChildCoupling]:
    "Avoid coupling parent behavior or state to a child component. Instead, lift shared logic or state up to the parent.",
  [messageIds.avoidResettingStateFromProps]:
    'Avoid resetting state from props. If "{{prop}}" is a key, pass it as `key` instead so React will reset the component.',
  [messageIds.avoidEventHandler]:
    "Avoid using state as an event handler. Instead, call the event handler directly.",
};
