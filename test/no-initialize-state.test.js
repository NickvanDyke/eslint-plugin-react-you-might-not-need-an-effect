import { MyRuleTester, js } from "./rule-tester.js";
import rule from "../src/no-initialize-state.js";

new MyRuleTester().run("no-initialize-state", rule, {
  valid: [
    {
      name: "To external data via Promise",
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
      name: "To external data via async IIFE",
      code: js`
        function MyComponent() {
          const [state, setState] = useState();

          useEffect(() => {
            (async () => {
              const response = await fetch("https://api.example.com/data");
              const data = await response.json();
              setState(data);
            })();
          }, []);
        }
      `,
    },
    {
      // Don't know why someone would use a synchronous IIFE here,
      // hence we don't make the effort to flag it, but just documenting this behavior.
      name: "To literal inside synchronous IIFE",
      code: js`
        function MyComponent() {
          const [state, setState] = useState();

          useEffect(() => {
            (() => {
              setState("Hello");
            })();
          }, []);
        }
      `,
    },
    {
      name: "To literal inside IIFE inside callback",
      code: js`
        import { useEffect, useState } from 'react';

        export const MyComponent = () => {
          const [state, setState] = useState();

          useEffect(() => {
            window.addEventListener('load', () => {
              (() => {
                setState('Loaded');
              })();
            });
          }, []);
        };
      `,
    },
    {
      name: "To literal inside callback inside IIFE",
      code: js`
        import { useEffect, useState } from 'react';

        export const MyComponent = () => {
          const [state, setState] = useState();

          useEffect(() => {
            (() => {
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
  ],
});
