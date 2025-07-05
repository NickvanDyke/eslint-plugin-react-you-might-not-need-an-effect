import { MyRuleTester, js } from "./rule-tester.js";
import { rule, name, messages } from "../src/no-chain-state-updates.js";

new MyRuleTester().run(name, rule, {
  invalid: [
    {
      // React docs recommend to first update state in render instead of an effect.
      // But then continue on to say that usually you can avoid the sync entirely by
      // more wisely choosing your state. So we'll just always warn about chained state.
      name: "Syncing prop changes to internal state",
      code: js`
        function List({ items }) {
          const [selection, setSelection] = useState();

          useEffect(() => {
            setSelection(null);
          }, [items]);

          return (
            <div>
              {items.map((item) => (
                <div key={item.id} onClick={() => setSelection(item)}>
                  {item.name}
                </div>
              ))}
            </div>
          )
        }
      `,
      errors: [
        {
          messageId: messages.avoidChainingStateUpdates,
        },
      ],
    },
    {
      name: "Conditionally setting state from internal state",
      code: js`
        function Form() {
          const [error, setError] = useState();
          const [result, setResult] = useState();

          useEffect(() => {
            if (result.data) {
              setError(null);
            }
          }, [result]);
        }
      `,
      errors: [
        {
          messageId: messages.avoidChainingStateUpdates,
        },
      ],
    },
    {
      name: "In an otherwise valid effect",
      code: js`
        function MyComponent() {
          const [state, setState] = useState();
          const [otherState, setOtherState] = useState('Meow');

          useEffect(() => {
            console.log('Meow');
            setState('Hello World');
          }, [otherState]);
        }
      `,
      errors: [
        {
          messageId: messages.avoidChainingStateUpdates,
          data: { state: "state" },
        },
      ],
    },
  ],
});
