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
  ],
  invalid: [
    {
      name: "Effect with no args",
      code: js`
        function Component() {
          useEffect();
        }
      `,
      errors: [
        {
          messageId: messages.avoidEmptyEffect,
        },
      ],
    },
    {
      name: "Empty effect body",
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
