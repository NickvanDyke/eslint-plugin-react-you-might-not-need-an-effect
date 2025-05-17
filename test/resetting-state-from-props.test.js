import { MyRuleTester, js } from "./rule-tester.js";

new MyRuleTester().run("/resetting-state-from-props", {
  invalid: [
    {
      name: "Reset all state when a prop changes",
      code: js`
        function ProfilePage({ userId }) {
          const [user, setUser] = useState(null);
          const [comment, setComment] = useState('type something');

          useEffect(() => {
            setUser(null);
            setComment('type something');
          }, [userId]);
        }
      `,
      errors: [
        {
          messageId: "avoidInternalEffect",
        },
        {
          messageId: "avoidResettingStateFromProps",
        },
        // TODO: Maybe early return to skip these flags?
        // Kinda confusing for user
        {
          messageId: "avoidChainingState",
        },
        {
          messageId: "avoidChainingState",
        },
      ],
    },
    {
      // Valid from the perspective of this particular flag
      name: "Resetting some state when a prop changes",
      code: js`
        function ProfilePage({ userId }) {
          const [user, setUser] = useState(null);
          const [comment, setComment] = useState('type something');
          const [catName, setCatName] = useState('Sparky');

          useEffect(() => {
            setUser(null);
            setComment('meow')
          }, [userId]);
        }
      `,
      errors: [
        {
          messageId: "avoidInternalEffect",
        },
        {
          messageId: "avoidChainingState",
        },
        {
          messageId: "avoidChainingState",
        },
      ],
    },
  ],
});
