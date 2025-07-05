import { MyRuleTester, js } from "./rule-tester.js";
import { messageIds } from "../src/messages.js";
import { rule } from "../src/rule.js";

new MyRuleTester().run("/initializing-state", rule, {
  valid: [
    {
      name: "To external data",
      code: js`
        function MyComponent() {
          const [state, setState] = useState();

          useEffect(() => {
            fetch("https://api.example.com/data")
              .then(response => response.json())
              .then(data => setState(data));
          }, []);
        }
      `,
    },
  ],
  invalid: [
    {
      name: "To literal",
      code: js`
        function MyComponent() {
          const [state, setState] = useState();

          useEffect(() => {
            setState("Hello");
          }, []);

          return <div>{state}</div>;
        }
      `,
      errors: [
        {
          messageId: messageIds.avoidInitializingState,
          data: { state: "state" },
        },
      ],
    },
    {
      name: "To internal data",
      code: js`
        function MyComponent() {
          const [state, setState] = useState();
          const [otherState, setOtherState] = useState('Meow');

          useEffect(() => {
            setState(otherState);
          }, []);
        }
      `,
      errors: [
        {
          messageId: messageIds.avoidInitializingState,
          data: { state: "state" },
        },
        {
          messageId: messageIds.avoidDerivedState,
        },
      ],
    },
    {
      name: "In an otherwise valid effect",
      code: js`
        function MyComponent() {
          const [state, setState] = useState();

          useEffect(() => {
            console.log('Meow');
            setState('Hello World');
          }, []);
        }
      `,
      errors: [
        {
          messageId: messageIds.avoidInitializingState,
          data: { state: "state" },
        },
      ],
    },
  ],
});
