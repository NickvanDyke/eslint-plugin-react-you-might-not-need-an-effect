import { MyRuleTester, js } from "./rule-tester.js";
import rule from "../src/no-adjust-state-on-prop-change.js";

new MyRuleTester().run("no-adjust-state-on-prop-change", rule, {
  valid: [
    {
      name: "Adjusting state directly during render",
      code: js`
        function List({ items }) {
          const [isReverse, setIsReverse] = useState(false);
          const [selection, setSelection] = useState(null);

          const [prevItems, setPrevItems] = useState(items);
          if (items !== prevItems) {
            setPrevItems(items);
            setSelection(null);
          }
        }
      `,
    },
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
    },
    {
      name: "Setting state to a value derived from props",
      code: js`
        function Counter({ count }) {
          const [doubleCount, setDoubleCount] = useState(0);
          
          useEffect(() => {
            setDoubleCount(count * 2);
          }, [count]);
        }
      `,
    },
  ],
  invalid: [
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
      errors: [
        {
          messageId: "avoidAdjustingStateWhenAPropChanges",
        },
      ],
    },
    {
      name: "Conditionally setting state to literal when internal prop changes",
      code: js`
        function Form({ result }) {
          const [error, setError] = useState();

          useEffect(() => {
            if (result.data) {
              setError(null);
            }
          }, [result]);
        }
      `,
      errors: [
        {
          messageId: "avoidAdjustingStateWhenAPropChanges",
        },
      ],
    },
  ],
});
