import { MyRuleTester, js } from "./rule-tester.js";
import rule from "../src/no-chain-state-updates.js";

new MyRuleTester().run("no-chain-state-updates", rule, {
  valid: [
    {
      name: "Setting state to literal when props change",
      code: js`
        function List({ items }) {
          const [selection, setSelection] = useState();

          useEffect(() => {
            setSelection(null);
          }, [items]);
        }
      `,
    },
    {
      name: "Setting state to a value derived from state",
      code: js`
        function Counter() {
          const [count, setCount] = useState(0);
          const [doubleCount, setDoubleCount] = useState(0);
          
          useEffect(() => {
            setDoubleCount(count * 2);
          }, [count]);
        }
      `,
    },
    {
      name: "Setting state to literal when external state changes",
      code: js`
        function Feed() {
          const { data: posts } = useQuery('/posts');
          const [scrollPosition, setScrollPosition] = useState(0);

          useEffect(() => {
            setScrollPosition(0);
          }, [posts]);
        }
      `,
    },
    {
      name: "Synchronize internal state with literal",
      code: js`
        function Component() {
          const [isMounted, setIsMounted] = useState(false);

          useEffect(() => {
            setIsMounted(true);
            return () => setIsMounted(false);
          }, [setIsMounted]);
        }
      `,
    },
  ],
  invalid: [
    {
      name: "Setting state to literal when internal state changes",
      code: js`
        function Counter() {
          const [count, setCount] = useState(0);
          const [otherState, setOtherState] = useState();

          useEffect(() => {
            setOtherState('Hello World');
          }, [count]);
        }
      `,
      errors: [
        {
          messageId: "avoidChainingStateUpdates",
        },
      ],
    },
    {
      name: "Conditionally setting state to literal when internal state changes",
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
          messageId: "avoidChainingStateUpdates",
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
          messageId: "avoidChainingStateUpdates",
          data: { state: "state" },
        },
      ],
    },
  ],
});
