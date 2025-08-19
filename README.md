# ESLint - React - You Might Not Need An Effect

ESLint plugin to catch [unnecessary React `useEffect`s](https://react.dev/learn/you-might-not-need-an-effect) to make your code easier to follow, faster to run, and less error-prone. Highly recommended for new React developers as you learn its mental model, and even experienced developers may be surprised.

## 🚀 Setup

This plugin requires ESLint >= v7.0.0 and Node >= 14.

### Installation

**NPM**:

```bash
npm install --save-dev eslint-plugin-react-you-might-not-need-an-effect
```

**Yarn**:

```bash
yarn add -D eslint-plugin-react-you-might-not-need-an-effect
```

### Configuration

Add the plugin's recommended config to your ESLint configuration file.

#### Legacy config (`.eslintrc`)

```js
{
  "extends": [
    "plugin:react-you-might-not-need-an-effect/legacy-recommended"
  ],
}
```

#### Flat config (`eslint.config.js`)

```js
import reactYouMightNotNeedAnEffect from "eslint-plugin-react-you-might-not-need-an-effect";

export default [
  reactYouMightNotNeedAnEffect.configs.recommended
];
```

### Recommended

The plugin will have more information to act upon when you pass the correct dependencies to your effect — [`react-hooks/exhaustive-deps`](https://www.npmjs.com/package/eslint-plugin-react-hooks).

## 🔎 Rules

**Legend:**
- 🟡 = Enabled as a warning in the recommended config
- 🔴 = Enabled as an error in the recommended config
- ⚪ = Not enabled by default

| Rule | Description | React Docs | Default |
|------|-------------|---------------|---------|
| `no-derived-state` | Disallow storing derived state in an effect. | [docs](https://react.dev/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state) | 🟡 |
| `no-chain-state-updates` | Disallow chaining state updates in an effect. | [docs](https://react.dev/learn/you-might-not-need-an-effect#chains-of-computations) | 🟡 |
| `no-initialize-state` | Disallow initializing state in an effect. | — | 🟡 |
| `no-event-handler` | Disallow using state and an effect as an event handler. | [docs](https://react.dev/learn/you-might-not-need-an-effect#sharing-logic-between-event-handlers) | 🟡 |
| `no-reset-all-state-when-a-prop-changes` | Disallow resetting all state in an effect when a prop changes. | [docs](https://react.dev/learn/you-might-not-need-an-effect#resetting-all-state-when-a-prop-changes) | 🟡 |
| `no-pass-live-state-to-parent` | Disallow passing live state to parents in an effect. | [docs](https://react.dev/learn/you-might-not-need-an-effect#notifying-parent-components-about-state-changes) | 🟡 |
| `no-pass-data-to-parent` | Disallow passing data to parents in an effect. | [docs](https://react.dev/learn/you-might-not-need-an-effect#passing-data-to-the-parent) | 🟡 |
| `no-manage-parent` | Disallow effects that only use props. | — | 🟡 |
| `no-empty-effect` | Disallow empty effects. | — | 🟡 |


## ⚠️ Caveats

The ways to (mis)use an effect are practically endless — see the [tests](./test) for (in)valid examples. If you encounter unexpected behavior in real-world usage, please [open an issue](https://github.com/NickvanDyke/eslint-plugin-react-you-might-not-need-an-effect/issues/new). Your feedback helps improve the plugin for everyone!

## 📖 Learn More

- https://react.dev/reference/react/useEffect
- https://react.dev/learn/you-might-not-need-an-effect
- https://react.dev/learn/synchronizing-with-effects
- https://react.dev/learn/separating-events-from-effects
- https://react.dev/learn/lifecycle-of-reactive-effects

