import { MyRuleTester, js } from "./rule-tester.js";
import { name, messages, rule } from "../src/no-pass-data-to-parent.js";

new MyRuleTester().run(name, rule, {
  valid: [
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
          messageId: messages.avoidPassingDataToParent,
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
      name: "Pass literal value to prop",
      code: js`
        const Child = ({ onTextChanged }) => {
          useEffect(() => {
            onTextChanged("Hello World");
          }, [onTextChanged]);
        }
      `,
      errors: [
        {
          messageId: messages.avoidPassingDataToParent,
        },
      ],
    },
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
          messageId: messages.avoidPassingDataToParent,
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
          messageId: messages.avoidPassingDataToParent,
        },
      ],
    },
    {
      name: "Pass external state that's retrieved in effect",
      todo: true, // TODO: We ignore the `data` variable because it's a Parameter :/
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
          messageId: messages.avoidPassingDataToParent,
        },
      ],
    },
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
          messageId: messages.avoidPassingDataToParent,
        },
      ],
    },
  ],
});
