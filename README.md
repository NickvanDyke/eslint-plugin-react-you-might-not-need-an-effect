# ESLint - React - You Might Not Need An Effect

ESLint plugin to catch [unnecessary React `useEffect`s](https://react.dev/learn/you-might-not-need-an-effect) to make your code easier to follow, faster to run, and less error-prone. Highly recommended for new React developers as you learn its mental model, and even experienced developers may be surprised.

## 📦 Installation

### NPM

```bash
npm install --save-dev eslint-plugin-react-you-might-not-need-an-effect
```

### Yarn

```bash
yarn add -D eslint-plugin-react-you-might-not-need-an-effect
```

## ⚙️ Configuration

### Recommended

Add the plugin's recommended config to your ESLint configuration file to enable every rule as a warning.

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

### Custom

If not using the recommended config, manually set your `languageOptions`:

```js
import globals from "globals";

// ...
{
  globals: {
    ...globals.browser,
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
};
```

### Suggested

The plugin can provide more accurate analysis when you pass the correct dependencies to your effects — consider using [`react-hooks/exhaustive-deps`](https://www.npmjs.com/package/eslint-plugin-react-hooks).

## 🔎 Rules

See the [tests](./test) for extensive (in)valid examples for each rule.

### `no-derived-state` — [docs](https://react.dev/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state)

Disallow storing derived state in an effect:

```js
function Form() {
  const [firstName, setFirstName] = useState('Taylor');
  const [lastName, setLastName] = useState('Swift');

  const [fullName, setFullName] = useState('');
  useEffect(() => {
    setFullName(firstName + ' ' + lastName);
  }, [firstName, lastName]);
}
```

### `no-chain-state-updates` — [docs](https://react.dev/learn/you-might-not-need-an-effect#chains-of-computations)

Disallow chaining state updates in an effect:

```js
function Game() {
  const [round, setRound] = useState(1);
  const [isGameOver, setIsGameOver] = useState(false);

  useEffect(() => {
    if (round > 10) {
      setIsGameOver(true);
    }
  }, [round]);
}
```

### `no-event-handler` — [docs](https://react.dev/learn/you-might-not-need-an-effect#sharing-logic-between-event-handlers)

Disallow using state and an effect as an event handler:

```js
function ProductPage({ product, addToCart }) {
  useEffect(() => {
    if (product.isInCart) {
      showNotification(`Added ${product.name} to the shopping cart!`);
    }
  }, [product]);
}
```

### `no-adjust-state-on-prop-change` — [docs](https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)

Disallow adjusting state in an effect when a prop changes:

```js
function List({ items }) {
  const [isReverse, setIsReverse] = useState(false);
  const [selection, setSelection] = useState(null);

  useEffect(() => {
    setSelection(null);
  }, [items]);
}
```

### `no-reset-all-state-on-prop-change` — [docs](https://react.dev/learn/you-might-not-need-an-effect#resetting-all-state-when-a-prop-changes)

Disallow resetting all state in an effect when a prop changes:

```js
function List({ items }) {
  const [selection, setSelection] = useState(null);

  useEffect(() => {
    setSelection(null);
  }, [items]);
}
```

### `no-pass-live-state-to-parent` — [docs](https://react.dev/learn/you-might-not-need-an-effect#notifying-parent-components-about-state-changes)

Disallow passing live state to parents in an effect:

```js
function Child({ onTextChanged }) {
  const [text, setText] = useState();

  useEffect(() => {
    onTextChanged(text);
  }, [onTextChanged, text]);
}
```

### `no-pass-data-to-parent` — [docs](https://react.dev/learn/you-might-not-need-an-effect#passing-data-to-the-parent)

Disallow passing data to parents in an effect:

```js
function Child({ onDataFetched }) {
  const { data } = useQuery('/data')

  useEffect(() => {
    onDataFetched(data)
  }, [data, onDataFetched]);
}
```

### `no-pass-ref-to-parent` — [docs](https://react.dev/reference/react/forwardRef)

Disallow passing refs, or data from callbacks registered on them, to parents in an effect. Use `forwardRef` instead:

```js
function Child({ onRef }) {
  const ref = useRef();

  useEffect(() => {
    onRef(ref.current);
  }, [onRef, ref.current]);
}
```

```js
const Child = ({ onClicked }) => {
  const ref = useRef();
  useEffect(() => {
    ref.current.addEventListener('click', (event) => {
      onClicked(event);
    });
  }, [onClicked]);
}
```

### `no-initialize-state`

Disallow initializing state in an effect:

```js
function Component() {
  const [state, setState] = useState();

  useEffect(() => {
    setState("Hello World");
  }, []);
}
```

### `no-manage-parent`

Disallow effects that only use props:

```js
function Child({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) {
      onClose();
    }
  }, [isOpen, onClose]);
}
```

### `no-empty-effect`

Disallow empty effects:

```js
function Component() {
  useEffect(() => {}, []);
}
```

## 💬 Feedback

The ways to (mis)use an effect in real-world code are practically endless! This plugin is not exhaustive, and minimizes false positives at the expense of occasional false negatives. If you encounter unexpected behavior or see opportunities for improvement, please open an issue. Your feedback helps improve the plugin for everyone!

## 📖 Learn More

- https://react.dev/reference/react/useEffect
- https://react.dev/learn/you-might-not-need-an-effect
- https://react.dev/learn/synchronizing-with-effects
- https://react.dev/learn/separating-events-from-effects
- https://react.dev/learn/lifecycle-of-reactive-effects
