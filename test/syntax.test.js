import { MyRuleTester, js } from "./rule-tester.js";
import { rule, name, messages } from "../src/no-derived-state.js";

// Syntax variations that are semantically equivalent
new MyRuleTester().run(name, rule, {
  valid: [
    {
      name: "useLayoutEffect",
      code: js`
          function DoubleCounter() {
            const ref = useRef();
            const [count, setCount] = useState(0);
            const [doubleCount, setDoubleCount] = useState(0);

            useLayoutEffect(() => {
              if (count == 0) {
                ref.current?.focus();
              }
            }, [count]);

            return (
              <input ref={ref} value={count} />
            )
          }
        `,
      errors: 1,
    },
    {
      name: "Two components with overlapping names",
      // Not a super realistic example
      code: js`
        function ComponentOne() {
          const [data, setData] = useState();
        }

        function ComponentTwo() {
          const setData = (data) => {
            console.log(data);
          }

          useEffect(() => {
            setData('hello');
          }, []);
        }
      `,
    },
    {
      // TODO: We don't follow functions passed directly to the effect right now
      name: "Passing non-anonymous function to effect",
      code: js`
        function Form({ onClose }) {
          const [name, setName] = useState();
          const [isOpen, setIsOpen] = useState(true);

          useEffect(onClose, [isOpen]);
        }
      `,
    },
    {
      name: "Variable name shadows state name",
      code: js`
        import { getCountries } from 'library';

        function CountrySelect({ translation }) {
          const [countries, setCountries] = useState();

          useEffect(() => {
            // Verify that the shadowing variable is not considered a state ref
            const countries = getCountries(translation);
            setCountries(countries);
          },
            // Important to the test: Leads us to check useState initializers,
            // so we can verify that we don't try to find a useState for the shadowing variable
            [translation]
          );
        }
      `,
    },
    {
      name: "Reacting to external state changes with member access in deps",
      code: js`
        function Feed() {
          const { data } = useQuery('/posts');
          const [scrollPosition, setScrollPosition] = useState(0);

          useEffect(() => {
            setScrollPosition(0);
          }, [data.posts]);
        }
      `,
    },
    {
      // https://github.com/NickvanDyke/eslint-plugin-react-you-might-not-need-an-effect/issues/16
      name: "External IIFE",
      code: js`
        import { useEffect, useState } from 'react';

        export const App = () => {
          const [response, setResponse] = useState(null);

          const fetchYesNoApi = () => {
            return (async () => {
              try {
                const response = await fetch('https://yesno.wtf/api');
                if (!response.ok) {
                  throw new Error('Network error');
                }
                const data = await response.json();
                setResponse(data);
              } catch (err) {
                console.error(err);
              }
            })();
          };

          useEffect(() => { 
            (async () => {
              await fetchYesNoApi();
            })();
          }, []);

          return (
            <div>{response}</div>
          );
        };
      `,
    },
  ],
  invalid: [
    {
      name: "Function component",
      code: js`
         function DoubleCounter() {
           const [count, setCount] = useState(0);
           const [doubleCount, setDoubleCount] = useState(0);

           useEffect(() => setDoubleCount(count * 2), [count]);
         }
       `,
      errors: 1,
    },
    {
      name: "Arrow function component",
      code: js`
         const DoubleCounter = () => {
           const [count, setCount] = useState(0);
           const [doubleCount, setDoubleCount] = useState(0);

           useEffect(() => setDoubleCount(count * 2), [count]);
         }
       `,
      errors: 1,
    },
    {
      name: "Memoized component, with props",
      code: js`
        const DoubleCounter = memo(({ count }) => {
          const [doubleCount, setDoubleCount] = useState(0);

          useEffect(() => setDoubleCount(count), [count]);
        });
      `,
      errors: [
        {
          messageId: messages.avoidDerivedState,
          data: { state: "doubleCount" },
        },
      ],
    },
    {
      name: "Effect one-liner body",
      code: js`
         const AvoidDuplicateTest = () => {
           const [count, setCount] = useState(0);
           const [doubleCount, setDoubleCount] = useState(0);

           useEffect(() => setDoubleCount(count * 2), [count]);
         }
       `,
      errors: 1,
    },
    {
      name: "Effect single-statement body",
      code: js`
         const DoubleCounter = () => {
           const [count, setCount] = useState(0);
           const [doubleCount, setDoubleCount] = useState(0);

           useEffect(() => { setDoubleCount(count * 2); }, [count]);
         }
       `,
      errors: 1,
    },
    {
      name: "Effect multi-statement body",
      code: js`
         const DoubleCounter = () => {
           const [count, setCount] = useState(0);
           const [doubleCount, setDoubleCount] = useState(0);

           useEffect(() => { setDoubleCount(count * 2); setDoubleCount(count * 2); }, [count]);
         }
       `,
      errors: 2,
    },
    {
      name: "Effect anonymous function body",
      code: js`
         const DoubleCounter = () => {
           const [count, setCount] = useState(0);
           const [doubleCount, setDoubleCount] = useState(0);

           useEffect(function() { setDoubleCount(count * 2); }, [count]);
         }
       `,
      errors: 1,
    },
    {
      name: "React.useEffect",
      code: js`
          function DoubleCounter() {
            const [count, setCount] = useState(0);
            const [doubleCount, setDoubleCount] = useState(0);

            React.useEffect(() => {
              setDoubleCount(count * 2);
            }, [count]);
          }
        `,
      errors: 1,
    },
    {
      name: "Non-destructured props",
      code: js`
         function DoubleCounter(props) {
           const [count, setCount] = useState(0);
           const [doubleCount, setDoubleCount] = useState(0);

           useEffect(() => setDoubleCount(props.count * 2), [props.count]);
         }
       `,
      errors: 1,
    },
    {
      name: "Destructured props",
      code: js`
         function DoubleCounter({ propCount }) {
           const [count, setCount] = useState(0);
           const [doubleCount, setDoubleCount] = useState(0);

           useEffect(() => setDoubleCount(propCount * 2), [propCount]);
         }
       `,
      errors: 1,
    },
    {
      name: "Renamed destructured props",
      code: js`
         function DoubleCounter({ count: countProp }) {
           const [count, setCount] = useState(0);
           const [doubleCount, setDoubleCount] = useState(0);

           useEffect(() => setDoubleCount(countProp * 2), [countProp]);
         }
       `,
      errors: 1,
    },
    {
      name: "Doubly deep MemberExpression in effect",
      code: js`
         function DoubleCounter(props) {
           const [count, setCount] = useState(0);
           const [doubleCount, setDoubleCount] = useState(0);

           useEffect(() => setDoubleCount(props.nested.count * 2), [props.nested.count]);
         }
       `,
      errors: 1,
    },
    {
      name: "Objects stored in state",
      code: js`
          function DoubleCounter() {
            const [count, setCount] = useState({ value: 0 });
            const [doubleCount, setDoubleCount] = useState({ value: 0 });

            useEffect(() => {
              setDoubleCount({ value: count.value * 2 });
            }, [count]);
          }
        `,
      errors: 1,
    },
    {
      name: "Optional chaining and nullish coalescing",
      code: js`
        function DoubleCounter({ count }) {
          const [doubleCount, setDoubleCount] = useState(0);

          useEffect(() => {
            setDoubleCount((count?.value ?? 1) * 2);
          }, [count?.value]);
        }
      `,
      errors: 1,
    },
    {
      // `exhaustive-deps` doesn't enforce member access in the deps
      name: "Member access in effect body but not in deps",
      code: js`
         function DoubleCounter(props) {
           const [count, setCount] = useState(0);
           const [doubleCount, setDoubleCount] = useState(0);

           useEffect(() => setDoubleCount(props.count * 2), [props]);
         }
       `,
      errors: 1,
    },
    {
      name: "Doubly nested scopes in effect body",
      code: js`
         const DoubleCounter = () => {
           const [count, setCount] = useState(0);
           const [doubleCount, setDoubleCount] = useState(0);

           useEffect(() => {
             if (count > 10) {
               if (count > 100) {
                 setDoubleCount(count * 4);
               } else {
                 setDoubleCount(count * 2);
               }
             } else {
               setDoubleCount(count);
             }
           }, [count]);
         }
       `,
      errors: 3,
    },
    {
      name: "Destructured array skips element in variable declaration",
      code: js`
        function SecondPost({ posts }) {
          const [secondPost, setSecondPost] = useState();

          useEffect(() => {
            const [, second] = posts;
            setSecondPost(second);
          }, [posts]);
        }
      `,
      errors: 1,
    },
    {
      name: "Value-less useState",
      code: js`
        import { useState } from 'react';

        function AttemptCounter() {
          const [, setAttempts] = useState(0);
          const [count, setCount] = useState(0);

          useEffect(() => {
            setAttempts((prev) => {
              return prev + count;
            });
          }, [count]);
        }
      `,
      errors: [
        {
          messageId: messages.avoidDerivedState,
          data: { state: "setAttempts" },
        },
      ],
    },
    {
      name: "Setter-less useState",
      code: js`
        function AttemptCounter() {
          const [attempts, setAttempts] = useState(0);
          const [count] = useState(0);

          useEffect(() => {
            setAttempts(count);
          }, [count]);
        }
      `,
      errors: [
        {
          messageId: messages.avoidDerivedState,
          data: { state: "attempts" },
        },
      ],
    },
    {
      name: "Custom hook with state",
      code: js`
        function useCustomHook() {
          const [count, setCount] = useState(0);
          const [doubleCount, setDoubleCount] = useState(0);

          useEffect(() => {
            setDoubleCount(count * 2);
          }, [count]);

          return state;
        }

        function Component() {
          const customState = useCustomHook();
        }
      `,
      errors: [
        {
          messageId: messages.avoidDerivedState,
          data: { state: "doubleCount" },
        },
      ],
    },
    {
      name: "FunctionDeclaration custom hook with props",
      code: js`
        function useCustomHook(prop) {
          const [state, setState] = useState(0);

          useEffect(() => {
            setState(prop);
          }, [prop]);

          return state;
        }
      `,
      errors: [
        {
          messageId: messages.avoidDerivedState,
          data: { state: "state" },
        },
      ],
    },
    {
      name: "VariableDeclarator custom hook with object props",
      code: js`
        const useCustomHook = ({ prop }) => {
          const [state, setState] = useState(0);

          useEffect(() => {
            setState(prop);
          }, [prop]);

          return state;
        }
      `,
      errors: [
        {
          messageId: messages.avoidDerivedState,
          data: { state: "state" },
        },
      ],
    },
    {
      // Verifies that we don't check for upstream state and props in isolation
      name: "Derive from both state and props",
      code: js`
        function Component({ prop }) {
          const [state, setState] = useState(0);
          const [derived, setDerived] = useState(0);
          const combined = state + prop;

          useEffect(() => {
            setDerived(combined);
          }, [combined]);
        }
      `,
      errors: [
        {
          messageId: messages.avoidDerivedState,
          data: { state: "derived" },
        },
      ],
    },
    {
      // Effects shouldn't be called conditionally, but good to be prepared
      name: "Conditional useEffect",
      code: js`
        function DoubleCounter() {
          const [count, setCount] = useState(0);
          const [doubleCount, setDoubleCount] = useState(0);

          if (count > 10) {
            useEffect(() => {
              setDoubleCount(count * 2);
            }, [count]);
          }
        }
      `,
      errors: [
        {
          messageId: messages.avoidDerivedState,
          data: { state: "doubleCount" },
        },
      ],
    },
    {
      name: "Destructured array skips element in arrow function params",
      code: js`
        function FilteredPosts() {
          const posts = useSomeAPI();
          const [filteredPosts, setFilteredPosts] = useState([]);

          useEffect(() => {
            // Resulting AST node looks like:
            // {
            //   "type": "ArrayPattern",
            //   "elements": [
            //     null, <-- Must handle this!
            //     {
            //       "type": "Identifier",
            //       "name": "second"
            //     }
            //   ]
            // }
            setFilteredPosts(
              posts.filter(([, value]) => value !== "")
            );
          }, [posts]);
        }
      `,
      errors: [
        {
          messageId: messages.avoidDerivedState,
          data: { state: "filteredPosts" },
        },
      ],
    },
    {
      name: "With imports",
      code: js`
        import { useState, useEffect } from 'react';

        function CountAccumulator({ count }) {
          const [total, setTotal] = useState(count);

          useEffect(() => {
            setTotal((prev) => prev + count);
          }, [count]);
        }
      `,
      errors: [
        {
          messageId: messages.avoidDerivedState,
          data: { state: "total" },
        },
      ],
    },
  ],
});
