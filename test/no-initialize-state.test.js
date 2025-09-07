import { MyRuleTester, js } from "./rule-tester.js";
import rule from "../src/no-initialize-state.js";

new MyRuleTester().run("no-initialize-state", rule, {
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
    {
      name: "To literal in IIFE inside callback",
      code: js`
        import { useEffect, useState } from 'react';

        export const MyComponent = () => {
          const [state, setState] = useState();

          useEffect(() => {
            window.addEventListener('load', () => {
              (async () => {
                setState('Loaded');
              })();
            });
          }, []);
        };
      `,
    },
    {
      name: "To literal in callback inside IIFE",
      code: js`
        import { useEffect, useState } from 'react';

        export const MyComponent = () => {
          const [state, setState] = useState();

          useEffect(() => {
            (async () => {
              window.addEventListener('load', () => {
                setState('Loaded');
              });
            })();
          }, []);
        };
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
          messageId: "avoidInitializingState",
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
          messageId: "avoidInitializingState",
          data: { state: "state" },
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
          messageId: "avoidInitializingState",
          data: { state: "state" },
        },
      ],
    },
    {
      // https://github.com/NickvanDyke/eslint-plugin-react-you-might-not-need-an-effect/issues/16
      name: "To literal via IIFE",
      code: js`
        import { useEffect, useState } from 'react';

        export const App = () => {
          const [data, setData] = useState(null);

          const iife = () => {
            return (async () => {
              setData('Meow');
            })();
          };

          useEffect(() => { 
            (async () => {
              await iife();
            })();
          }, []);
        };
      `,
      errors: [
        {
          messageId: "avoidInitializingState",
        },
      ],
    },
  ],
});
