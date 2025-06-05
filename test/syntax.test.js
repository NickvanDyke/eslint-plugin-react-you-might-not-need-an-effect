import { MyRuleTester, js } from "./rule-tester.js";
import { messageIds } from "../src/messages.js";

// TODO: Should maybe do away with this... it helps writing but not readable
const code = ({
  componentDeclaration = js`const DoubleCounter = () =>`,
  effectBody = js`setDoubleCount(count * 2)`,
  effectDeps = js`[count]`,
}) => js`
  ${componentDeclaration} {
    const [count, setCount] = useState(0);
    const [doubleCount, setDoubleCount] = useState(0);

    useEffect(() => ${effectBody}, ${effectDeps});

    return (
      <div>
        <p>Count: {count}</p>
        <p>Double Count: {doubleCount}</p>
      </div>
    );
  }
`;

// Syntax variations that are semantically equivalent
// TODO: Could dynamically generate variations: https://mochajs.org/#dynamically-generating-tests
// Could be overkill; they shouldn't affect each other (supposedly, but I guess that's the point of tests!)
new MyRuleTester().run("/syntax", {
  valid: [
    {
      name: "Empty effect",
      code: js`
        function Component() {
          useEffect(() => {}, []);
        }
      `,
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
    },
    {
      // https://github.com/NickvanDyke/eslint-plugin-react-you-might-not-need-an-effect/issues/16
      name: "Async derived setter",
      todo: true,
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
      `
    }
  ],
  invalid: [
    {
      name: "Function component",
      code: code({
        componentDeclaration: js`function DoubleCounter()`,
      }),
      errors: 2,
    },
    {
      name: "Arrow function component",
      code: code({
        componentDeclaration: js`const DoubleCounter = () =>`,
      }),
      errors: 2,
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
          messageId: messageIds.avoidInternalEffect,
        },
        {
          messageId: messageIds.avoidDerivedState,
          data: { state: "doubleCount" },
        },
      ],
    },
    {
      name: "Effect one-liner body",
      code: code({
        componentDeclaration: js`const AvoidDuplicateTest = () =>`,
        effectBody: js`setDoubleCount(count * 2)`,
      }),
      errors: 2,
    },
    {
      name: "Effect single-statement body",
      code: code({
        effectBody: js`{ setDoubleCount(count * 2); }`,
      }),
      errors: 2,
    },
    {
      name: "Effect multi-statement body",
      code: code({
        effectBody: js`{ setDoubleCount(count * 2); setDoubleCount(count * 2); }`,
      }),
      errors: 3,
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
      errors: 2,
    },
    {
      name: "useLayoutEffect",
      code: js`
          function DoubleCounter() {
            const [count, setCount] = useState(0);
            const [doubleCount, setDoubleCount] = useState(0);

            useLayoutEffect(() => {
              setDoubleCount(count * 2);
            }, [count]);
          }
        `,
      errors: 2,
    },
    {
      name: "Non-destructured props",
      code: code({
        componentDeclaration: js`function DoubleCounter(props)`,
        effectBody: js`setDoubleCount(props.count * 2)`,
        effectDeps: js`[props.count]`,
      }),
      errors: 2,
    },
    {
      name: "Destructured props",
      code: code({
        componentDeclaration: js`function DoubleCounter({ propCount })`,
        effectBody: js`setDoubleCount(propCount * 2)`,
        effectDeps: js`[propCount]`,
      }),
      errors: 2,
    },
    {
      name: "Renamed destructured props",
      code: code({
        componentDeclaration: js`function DoubleCounter({ count: countProp })`,
        effectBody: js`setDoubleCount(countProp * 2)`,
        effectDeps: js`[countProp]`,
      }),
      errors: 2,
    },
    {
      name: "Doubly deep MemberExpression in effect",
      code: code({
        componentDeclaration: js`function DoubleCounter(props)`,
        effectBody: js`setDoubleCount(props.nested.count * 2)`,
        effectDeps: js`[props.nested.count]`,
      }),
      errors: 2,
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
      errors: 2,
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
      errors: 2,
    },
    {
      // `exhaustive-deps` doesn't enforce member access in the deps
      name: "Member access in effect body but not in deps",
      code: code({
        componentDeclaration: js`function DoubleCounter(props)`,
        effectBody: js`setDoubleCount(props.count * 2)`,
        effectDeps: js`[props]`,
      }),
      errors: 2,
    },
    {
      name: "Doubly nested scopes in effect body",
      code: code({
        effectBody: js`
            {
              if (count > 10) {
                if (count > 100) {
                  setDoubleCount(count * 4);
                } else {
                  setDoubleCount(count * 2);
                }
              } else {
                setDoubleCount(count);
              }
            }
          `,
      }),
      errors: 4,
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
      errors: 2,
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
          messageId: messageIds.avoidInternalEffect,
        },
        {
          messageId: messageIds.avoidDerivedState,
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
          messageId: messageIds.avoidInternalEffect,
        },
        {
          messageId: messageIds.avoidDerivedState,
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
          messageId: messageIds.avoidInternalEffect,
        },
        {
          messageId: messageIds.avoidDerivedState,
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
          messageId: messageIds.avoidInternalEffect,
        },
        {
          messageId: messageIds.avoidDerivedState,
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
          messageId: messageIds.avoidInternalEffect,
        },
        {
          messageId: messageIds.avoidDerivedState,
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
          messageId: messageIds.avoidInternalEffect,
        },
        {
          messageId: messageIds.avoidDerivedState,
          data: { state: "derived" },
        },
      ],
    },
  ],
});
