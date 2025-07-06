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
      name: "No-arg prop callback in response to internal state change",
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
      errors: [
        {
          messageId: messages.avoidPassingLiveStateToParent,
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
      name: "Prop from library HOC used internally",
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
      name: "Prop from library HOC used externally",
      code: js`
        import { withRouter } from 'react-router-dom';

        const MyComponent = withRouter(({ history }) => {
          const data = useSomeAPI();

          useEffect(() => {
            if (data.error) {
              history.push('/error-page');
            }
          }, [data]);
        });
      `,
    },
  ],
  invalid: [
    {
      name: "Pass live internal fetched state",
      code: js`
        const Child = ({ onFetched }) => {
          const [data, setData] = useState();

          useEffect(() => {
            onFetched(data);
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
      name: "Pass live derived internal state",
      code: js`
        const Child = ({ onFetched }) => {
          const [data, setData] = useState();

          useEffect(() => {
            const firstElement = data[0];
            onFetched(firstElement);
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
      name: "Pass live external state",
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
          messageId: messages.avoidPassingLiveStateToParent,
        },
      ],
    },
    {
      name: "Pass derived live external state",
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
          messageId: messages.avoidPassingLiveStateToParent,
        },
      ],
    },
    {
      name: "Pass final external state",
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
          // TODO: Ideally we catch using state as an event handler,
          // but not sure how to differentiate that
          messageId: messages.avoidPassingLiveStateToParent,
        },
      ],
    },
    // TODO: Catch in something like "no-managing-parent" - an effect that only references props
    // {
    //   name: "Call prop in response to prop change",
    //   code: js`
    //     function Form({ isOpen, events }) {
    //
    //       useEffect(() => {
    //         if (!isOpen) {
    //           // NOTE: Also verifies that we consider 'events' in 'events.onClose' to be a fn ref
    //           // (It's a MemberExpression under a CallExpression)
    //           events.onClose();
    //         }
    //       }, [isOpen]);
    //     }
    //   `,
    //   errors: [
    //     {
    //       messageId: messages.avoidParentChildCoupling,
    //     },
    //   ],
    // },
    {
      name: "From props via member function",
      code: js`
        function DoubleList({ list }) {
          const [doubleList, setDoubleList] = useState([]);

          useEffect(() => {
            setDoubleList(list.concat(list));
          }, [list]);
        }
      `,
      errors: [
        {
          // We consider `list.concat` to essentially be a prop callback
          messageId: messages.avoidPassingLiveStateToParent,
        },
      ],
    },
  ],
});
