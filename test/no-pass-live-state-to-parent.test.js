import { MyRuleTester, js } from "./rule-tester.js";
import { name, messages, rule } from "../src/no-pass-live-state-to-parent.js";

new MyRuleTester().run(name, rule, {
  valid: [
    {
      name: "Pass literal value to prop callback",
      code: js`
        const Child = ({ onTextChanged }) => {
          useEffect(() => {
            onTextChanged("Hello World");
          }, [onTextChanged]);
        }
      `,
    },
    {
      name: "Pass live external state",
      code: js`
        const Child = ({ onFetched }) => {
          const data = useSomeAPI();

          useEffect(() => {
            onFetched(data);
          }, [onFetched, data]);
        }
      `,
    },
    {
      // No idea why someone would do this, so we only check for passing state, but maybe there's a less contrived pattern.
      // `no-manage-parent` would catch this anyway.
      name: "Pass prop to parent",
      code: js`
        const Child = ({ text, onTextChanged }) => {
          useEffect(() => {
            onTextChanged(text);
          }, [text, onTextChanged]);
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
            <button onClick={() => setIsOpen(false)}>Submit</button>
          )
        }
      `,
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
      name: "Pass ref to parent",
      code: js`
        const Child = ({ onRef }) => {
          const ref = useRef();

          useEffect(() => {
            onRef(ref);
          }, [onRef, ref]);

          return <div ref={ref}>Child</div>;
        }
      `,
    },
  ],
  invalid: [
    {
      name: "Pass live internal state",
      code: js`
        const Child = ({ onTextChanged }) => {
          const [text, setText] = useState();

          useEffect(() => {
            onTextChanged(text);
          }, [onTextChanged, text]);

          return (
            <input
              type="text"
              onChange={(e) => setText(e.target.value)}
            />
          );
        }
      `,
      errors: [
        {
          messageId: messages.avoidPassingLiveStateToParent,
        },
      ],
    },
    {
      name: "Pass live internal state AND external state",
      code: js`
        const Child = ({ onTextChanged }) => {
          const [text, setText] = useState();
          const data = useSomeAPI();

          useEffect(() => {
            onTextChanged(text, data);
          }, [onTextChanged, text, data]);

          return (
            <input
              type="text"
              onChange={(e) => setText(e.target.value)}
            />
          );
        }
      `,
      errors: [
        {
          messageId: messages.avoidPassingLiveStateToParent,
        },
      ],
    },
    {
      name: "Pass live derived internal state",
      code: js`
        const Child = ({ onTextChanged }) => {
          const [text, setText] = useState();

          useEffect(() => {
            const firstChar = text[0];
            onTextChanged(firstChar);
          }, [onTextChanged, text]);

          return (
            <input
              type="text"
              onChange={(e) => setText(e.target.value)}
            />
          );
        }
      `,
      errors: [
        {
          messageId: messages.avoidPassingLiveStateToParent,
        },
      ],
    },
    {
      name: "Pass live internal state via derived prop",
      code: js`
        const Child = ({ onFetched }) => {
          const [data, setData] = useState();
          // No idea why someone would do this, but hey we can catch it
          const onFetchedWrapper = onFetched

          useEffect(() => {
            onFetchedWrapper(data);
          }, [onFetched, data]);
        }
      `,
      errors: [
        {
          messageId: messages.avoidPassingLiveStateToParent,
        },
      ],
    },
    {
      name: "Pass final internal state",
      code: js`
        function Form({ onSubmit }) {
          const [name, setName] = useState();
          const [dataToSubmit, setDataToSubmit] = useState();

          useEffect(() => {
            if (!dataToSubmit) return;

            onSubmit(dataToSubmit);
          }, [dataToSubmit]);

          return (
            <div>
              <input
                name="name"
                type="text"
                onChange={(e) => setName(e.target.value)}
              />
              <button onClick={() => setDataToSubmit({ name })}>Submit</button>
            </div>
          )
        }
      `,
      errors: [
        {
          messageId: messages.avoidPassingLiveStateToParent,
        },
      ],
    },
  ],
});
