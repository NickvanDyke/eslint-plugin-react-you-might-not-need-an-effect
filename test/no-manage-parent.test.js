import { MyRuleTester, js } from "./rule-tester.js";
import { name, rule, messages } from "../src/no-manage-parent.js";

new MyRuleTester().run(name, rule, {
  valid: [
    {
      name: "Effect uses state",
      code: js`
        function Component({ foo }) {
          const [bar] = useState(0);
          useEffect(() => {
            console.log(bar);
          }, [bar]);
        }
      `,
    },
    {
      name: "Effect uses HOC prop",
      code: js`
        const hoc = (Comp) => (props) => <Comp {...props} extra={123} />;

        const Component = hoc(function Component({ extra }) {
          useEffect(() => {
            extra;
          }, [extra]);
        });
      `,
    },
    {
      name: "Effect uses both prop and state",
      code: js`
        function Component({ foo }) {
          const [bar] = useState(0);
          useEffect(() => {
            foo;
            bar;
          }, [foo, bar]);
        }
      `,
    },
    {
      // TODO: Should this still flag? Or is it valid/idiomatic?
      // Maybe based on if all deps are props, ignoring the body?
      name: "Effect uses prop and external function",
      code: js`
        function Component({ foo }) {
          useEffect(() => {
            console.log(foo);
          }, [foo]);
        }
      `,
    },
  ],
  invalid: [
    {
      name: "Effect only parent prop",
      code: js`
        function Component({ foo }) {
          useEffect(() => {
            foo;
          }, [foo]);
        }
      `,
      errors: [
        {
          messageId: messages.avoidManagingParent,
        },
      ],
    },
    {
      name: "Effect uses multiple props with callback",
      code: js`
        function Child({ isOpen, onClose }) {
          useEffect(() => {
            if (!isOpen) {
              onClose();
            }
          }, [isOpen, onClose]);
        }
      `,
      errors: [
        {
          messageId: messages.avoidManagingParent,
        },
      ],
    },
  ],
});
