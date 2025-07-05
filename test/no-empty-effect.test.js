import { MyRuleTester, js } from "./rule-tester.js";
import { name, rule, messages } from "../src/no-empty-effect.js";

new MyRuleTester().run(name, rule, {
  valid: [
    {
      name: "Non-empty effect",
      code: js`
        function Component() {
          useEffect(() => {
            console.log("Meow");
          }, []);
        }
      `,
    },
    {
      name: "Effect without function",
      code: js`
        function Component() {
          useEffect();
        }
      `,
    },
  ],
  invalid: [
    {
      name: "Empty effect",
      code: js`
        function Component() {
          useEffect(() => {}, []);
        }
      `,
      errors: [
        {
          messageId: messages.avoidEmptyEffect,
        },
      ],
    },
    {
      name: "Empty effect without deps",
      code: js`
        function Component() {
          useEffect(() => {});
        }
      `,
      errors: [
        {
          messageId: messages.avoidEmptyEffect,
        },
      ],
    },
  ],
});
