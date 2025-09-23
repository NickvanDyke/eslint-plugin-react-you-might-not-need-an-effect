import { MyRuleTester, js } from "./rule-tester.js";
import rule from "../src/no-pass-data-to-parent.js";

new MyRuleTester().run("no-pass-data-to-parent", rule, {
  valid: [
    {
      name: "Pass literal value to prop",
      code: js`
        const Child = ({ onTextChanged }) => {
          useEffect(() => {
            onTextChanged("Hello World");
          }, [onTextChanged]);
        }
      `,
    },
    {
      name: "Pass internal state",
      code: js`
        const Child = ({ onTextChanged }) => {
          const [text, setText] = useState();

          useEffect(() => {
            onTextChanged(text);
          }, [onTextChanged, text]);

          return (
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          );
        }
      `,
    },
    {
      name: "Pass prop",
      code: js`
        const Child = ({ text, onTextChanged }) => {
          useEffect(() => {
            onTextChanged(text);
          }, [onTextChanged, text]);

          return (
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          );
        }
      `,
    },
    {
      name: "No-arg prop callback",
      code: js`
        function Form({ onClose }) {
          const [name, setName] = useState();
          const [isOpen, setIsOpen] = useState(true);

          useEffect(() => {
            if (!isOpen) {
              onClose();
            }
          }, [isOpen]);

          return (
            <button onClick={() => setIsOpen(false)}>Close</button>
          )
        }
      `,
      errors: [
        {
          messageId: "avoidPassingDataToParent",
        },
      ],
    },
    {
      // This might be an anti-pattern in the first place...
      name: "Prop getter",
      code: js`
        function Child({ getData }) {
          useEffect(() => {
            console.log(getData());
          }, [getData]);
        }
      `,
    },
    {
      name: "Pass internal state to HOC prop",
      code: js`
        import { withRouter } from 'react-router-dom';

        const MyComponent = withRouter(({ history }) => {
          const [option, setOption] = useState();

          useEffect(() => {
            history.push(option);
          }, [option]);
        });
      `,
    },
    {
      name: "Pass external state to HOC prop",
      code: js`
        import { withRouter } from 'react-router-dom';

        const MyComponent = withRouter(({ history }) => {
          const data = useSomeAPI();

          useEffect(() => {
            if (data.error) {
              history.push(data.error);
            }
          }, [data]);
        });
      `,
    },
    {
      // TODO: Definitely an anti-pattern, but may fit better elsewhere
      // because refs are not quite state, e.g. don't cause re-renders.
      // However they *are* local to the component...
      // At the least, could use a different message when flagged.
      // Or maybe user should be advised to use `forwardRef` instead? I think that's idiomatic.
      name: "Pass ref to parent",
      code: js`
        const Child = ({ onRef }) => {
          const ref = useRef();

          useEffect(() => {
            onRef(ref.current);
          }, [onRef, ref.current]);

          return <div ref={ref}>Child</div>;
        }
      `,
    },
  ],
  invalid: [
    {
      name: "Pass external state",
      code: js`
        const Child = ({ onFetched }) => {
          const data = useSomeAPI();

          useEffect(() => {
            onFetched(data);
          }, [onFetched, data]);
        }
      `,
      errors: [
        {
          messageId: "avoidPassingDataToParent",
        },
      ],
    },
    {
      name: "Pass derived external state",
      code: js`
        const Child = ({ onFetched }) => {
          const data = useSomeAPI();
          const firstElement = data[0];

          useEffect(() => {
            onFetched(firstElement);
          }, [onFetched, firstElement]);
        }
      `,
      errors: [
        {
          messageId: "avoidPassingDataToParent",
        },
      ],
    },
    {
      name: "Pass external state that's retrieved in effect via .then",
      code: js`
        const Child = ({ onFetched }) => {
          useEffect(() => {
            fetchData()
              .then((data) => onFetched(data));
          }, []);
        }
      `,
      errors: [
        {
          messageId: "avoidPassingDataToParent",
        },
      ],
    },
    {
      name: "Pass external state that's retrieved in effect via async/await",
      code: js`
        const Child = ({ onFetched }) => {
          useEffect(() => {
            (async () => {
              const data = await fetchData();
              onFetched(data);
            })();
          }, []);
        }
      `,
      errors: [
        {
          messageId: "avoidPassingDataToParent",
        },
      ],
    },
    {
      // If parent needs to listen to child's DOM events, it should set up the listener itself.
      // TODO: Better message? Advise to use `forwardRef`.
      name: "Register callback on ref to pass data to parent",
      code: js`
        const Child = ({ onClicked }) => {
          const ref = useRef();

          useEffect(() => {
            ref.current.addEventListener('click', (event) => {
              onClicked(event);
            });
          }, [onFetched]);

          return <SomeComponent ref={ref} />;
        }
      `,
      errors: [
        {
          messageId: "avoidPassingDataToParent",
        },
      ],
    },
    {
      name: "Pass window event data to parent",
      code: js`
        const Child = ({ onResized }) => {
          useEffect(() => {
            window.addEventListener('resize', (event) => {
              onResized({
                width: window.innerWidth,
                height: window.innerHeight,
              });
            });
            return () => window.removeEventListener('resize', handleResize);
          }, [onResized]);
        }
      `,
      errors: [
        {
          messageId: "avoidPassingDataToParent",
        },
      ],
    },
  ],
});
