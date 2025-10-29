import { MyRuleTester, js } from "./rule-tester.js";
import rule from "../src/rules/no-pass-ref-to-parent.js";

new MyRuleTester().run("no-pass-ref-to-parent", rule, {
  valid: [
    {
      name: "Pass internal state",
      code: js`
        const Child = ({ onTextChanged }) => {
          const [text, setText] = useState();
          useEffect(() => {
            onTextChanged(text);
          }, [onTextChanged, text]);
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
        }
      `,
    },
    {
      name: "No-arg prop callback",
      code: js`
        function Form({ onClose }) {
          const [isOpen, setIsOpen] = useState(true);
          useEffect(() => {
            if (!isOpen) {
              onClose();
            }
          }, [isOpen]);
        }
      `,
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
    },
    {
      name: "Register callback on ref prop",
      code: js`
        const Child = ({ ref }) => {
          useEffect(() => {
            ref.current.addEventListener('click', (event) => {
              console.log('Clicked', event);
            });
          }, [ref]);
        }
      `,
    },
  ],
  invalid: [
    {
      name: "Pass ref.current to parent callback",
      code: js`
        const Child = ({ onRef }) => {
          const ref = useRef();
          useEffect(() => {
            onRef(ref.current);
          }, [onRef, ref.current]);
        }
      `,
      errors: [
        {
          messageId: "avoidPassingRefToParent",
        },
      ],
    },
    {
      name: "Pass ref object to parent callback",
      code: js`
        const Child = ({ onRef }) => {
          const ref = useRef();
          useEffect(() => {
            onRef(ref);
          }, [onRef, ref]);
        }
      `,
      errors: [
        {
          messageId: "avoidPassingRefToParent",
        },
      ],
    },
    {
      name: "Register callback on ref to pass event to parent",
      code: js`
        const Child = ({ onClicked }) => {
          const ref = useRef();
          useEffect(() => {
            ref.current.addEventListener('click', (event) => {
              onClicked(event);
            });
          }, [onClicked]);
        }
      `,
      errors: [
        {
          messageId: "avoidPropCallbackInRefCallback",
        },
      ],
    },
  ],
});
