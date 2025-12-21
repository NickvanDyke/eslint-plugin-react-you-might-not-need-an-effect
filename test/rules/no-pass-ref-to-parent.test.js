import { MyRuleTester, js } from "../rule-tester.js";
import rule from "../../src/rules/no-pass-ref-to-parent.js";

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
      // https://github.com/NickvanDyke/eslint-plugin-react-you-might-not-need-an-effect/issues/37
      // Alternate solutions exist, but this is arguably the most readable.
      name: "Pass cleanup function that depends on ref",
      code: js`
        import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";

        function DeleteDropTarget({ onDelete }) {
          const ref = React.useRef(null);

          React.useEffect(() => {
            const element = ref.current;
            if (!element) {
              return;
            }

            const cleanup = dropTargetForElements({
              element,
              onDrop: ({ source }) => {
                onDelete(source.data);
              },
            });

            return cleanup;
          }, [onDelete]);

          return <div ref={ref}>Drop an item here to delete</div>;
        };
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
      name: "Pass derived ref.current to parent callback",
      code: js`
        const Child = ({ onRef }) => {
          const ref = useRef();

          useEffect(() => {
            const element = ref.current;

            if (element) {
              onRef(element);
            }
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
      name: "Pass local ref object to prop callback",
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
      name: "Register callback on prop ref",
      code: js`
        const Child = ({ ref }) => {
          useEffect(() => {
            ref.current.addEventListener('click', (event) => {
              console.log('Clicked', event);
            });
          }, [ref]);
        }
      `,
      errors: [
        {
          messageId: "avoidReceivingRefFromParent",
        },
      ],
    },
    {
      name: "Register callback on local ref to pass event to parent",
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
    {
      name: "Register callback on derived local ref to pass event to parent",
      code: js`
        const Child = ({ onClicked }) => {
          const ref = useRef();

          useEffect(() => {
            const element = ref.current;

            if (element) {
              element.addEventListener('click', (event) => {
                onClicked(event);
              });
            }
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
