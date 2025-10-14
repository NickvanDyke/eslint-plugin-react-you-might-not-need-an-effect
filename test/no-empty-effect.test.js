import { MyRuleTester, js } from "./rule-tester.js";
import rule from "../src/rules/no-empty-effect.js";

new MyRuleTester().run("no-empty-effect", rule, {
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
          messageId: "avoidEmptyEffect",
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
          messageId: "avoidEmptyEffect",
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
          messageId: "avoidEmptyEffect",
        },
      ],
    },
  ],
});
