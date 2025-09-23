import { MyRuleTester, js } from "./rule-tester.js";
import noDerivedState from "../src/no-derived-state.js";

// Analysis is quite syntax-dependent,
// so here we have a bunch of semantically equivalent simple tests to verify various syntax.
// While this tests `no-derived-state`, it's mostly about the utility functions under the hood.
// TODO: may make more sense to unit test those directly
new MyRuleTester().run("syntax", noDerivedState, {
  valid: [
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
          messageId: "avoidDerivedState",
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
          messageId: "avoidDerivedState",
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
          messageId: "avoidDerivedState",
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
          messageId: "avoidDerivedState",
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
          messageId: "avoidDerivedState",
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
          messageId: "avoidDerivedState",
          data: { state: "state" },
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
          messageId: "avoidDerivedState",
          data: { state: "doubleCount" },
        },
      ],
    },
    {
      // We don't follow functions passed directly to the effect right now
      todo: true,
      name: "Passing non-anonymous function to effect",
      code: js`
        function Form() {
          const [firstName, setFirstName] = useState('');
          const [lastName, setLastName] = useState('');
          const [name, setName] = useState('');

          function deriveName() {
            setName(firstName + ' ' + lastName);
          }

          useEffect(deriveName, [firstName, lastName]);
        }
      `,
      errors: [
        {
          messageId: "avoidDerivedState",
          data: { state: "isOpen" },
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
          messageId: "avoidDerivedState",
          data: { state: "filteredPosts" },
        },
      ],
    },
    {
      // TODO: All tests should have imports, to mimick real-world usage.
      // And then one test without imports I guess, to verify behavior.
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
          messageId: "avoidDerivedState",
          data: { state: "total" },
        },
      ],
    },
    {
      // TODO: https://github.com/NickvanDyke/eslint-plugin-react-you-might-not-need-an-effect/issues/34
      // Ah, I think we do descend, but the issue is `getUpstreamReactVariables` ignores
      // variables declared in FunctionDeclaration.params that aren't props...
      // So then the upstream variables are empty, resulting in `false` for `isState` and such.
      // But that's to prevent other false positives. How to narrow the logic?
      // Apparently not an issue for ArrowFunctionExpression.params...?
      // But shouldn't this be already covered because getDownstreamRefs at the callsite returns the function AND the params we pass to it, which we then analyze?
      // Maybe the function reference is not state, thus fails the check as a whole?
      // Yeah I think so, because again we ignore its params when resolving its upstream variables.
      // So it only contains internal references, and no external, but being empty fails the check,
      // even though only referencing its params makes it a pure function.
      // Careful how that interacts with imported function references too...
      // I guess we have to assume those are impure. But for local, we can check the function body for any external refs.
      // Question is how to work that into the existing logic cleanly...
      // Ideally it just integrates with upstream logic, so we don't have to make special function checks like "is pure".
      name: "Considers VariableDeclaration function body and params",
      todo: true,
      code: js`
        function Form() {
          const [firstName, setFirstName] = useState('Dwayne');
          const [lastName, setLastName] = useState('The Rock');
          const [fullName, setFullName] = useState('');

          function computeName(firstName, lastName) {
            return firstName + ' ' + lastName;
          }

          useEffect(() => {
            setFullName(computeName(firstName, lastName));
          }, [firstName, lastName]);
        }
      `,
      errors: [
        {
          messageId: "avoidDerivedState",
          data: { state: "fullName" },
        },
      ],
    },
    {
      name: "Considers ArrowFunctionExpression function body and params",
      code: js`
        function Form() {
          const [firstName, setFirstName] = useState('Dwayne');
          const [lastName, setLastName] = useState('The Rock');
          const [fullName, setFullName] = useState('');

          const computeName = (firstName, lastName) => {
            return firstName + ' ' + lastName;
          }

          useEffect(() => {
            setFullName(computeName(firstName, lastName));
          }, [firstName, lastName]);
        }
      `,
      errors: [
        {
          messageId: "avoidDerivedState",
          data: { state: "fullName" },
        },
      ],
    },
    {
      // TODO: I think this a similar root cause to the other function TODO in here - we don't descend into FunctionDeclaration bodies
      name: "Immediately calling FunctionDeclaration derived setter",
      todo: true,
      code: js`
        function Form() {
          const [firstName, setFirstName] = useState('Dwayne');
          const [lastName, setLastName] = useState('The Rock');
          const [fullName, setFullName] = useState('');

          useEffect(() => {
            function doSet() {
              setFullName(firstName + ' ' + lastName);
            }

            doSet();
          }, [firstName, lastName]);
        }
      `,
      errors: [
        {
          messageId: "avoidDerivedState",
          data: { state: "fullName" },
        },
      ],
    },
    {
      // TODO: Fails because `getCallExpr` returns the `doSet` call, *which has no arguments*,
      // but internally calls the setter with internal arguments.
      name: "Immediately calling VariableDeclaration no-arg derived setter",
      todo: true,
      code: js`
        function Form() {
          const [firstName, setFirstName] = useState('Dwayne');
          const [lastName, setLastName] = useState('The Rock');
          const [fullName, setFullName] = useState('');

          useEffect(() => {
            const doSet = () => {
              setFullName(firstName + ' ' + lastName);
            }

            doSet();
          }, [firstName, lastName]);
        }
      `,
      errors: [
        {
          messageId: "avoidDerivedState",
          data: { state: "fullName" },
        },
      ],
    },
  ],
});
