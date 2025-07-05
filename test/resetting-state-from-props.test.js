import { MyRuleTester, js } from "./rule-tester.js";
import { messageIds } from "../src/messages.js";
import { rule } from "../src/rule.js";

new MyRuleTester().run("/resetting-state-from-props", rule, {
  invalid: [
    {
      // Valid wrt this flag
      name: "Set state when a prop changes, but not to its default value",
      code: js`
        function List({ items }) {
          const [selection, setSelection] = useState();

          useEffect(() => {
            setSelection(items[0]);
          }, [items]);
        }
      `,
      errors: [
        {
          messageId: messageIds.avoidDerivedState,
        },
      ],
    },
    {
      // Valid wrt this flag
      name: "Reset some state when a prop changes",
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
          messageId: messageIds.avoidChainingState,
        },
        {
          messageId: messageIds.avoidChainingState,
        },
      ],
    },
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
          messageId: messageIds.avoidResettingStateFromProps,
          data: { prop: "userId" },
        },
      ],
    },
    {
      name: "Reset all state to shared var when a prop changes",
      code: js`
        function ProfilePage({ userId }) {
          const initialState = 'meow meow'
          const [user, setUser] = useState(null);
          const [comment, setComment] = useState(initialState);

          useEffect(() => {
            setUser(null);
            setComment(initialState);
          }, [userId]);
        }
      `,
      errors: [
        {
          messageId: messageIds.avoidResettingStateFromProps,
          data: { prop: "userId" },
        },
      ],
    },
    {
      name: "Reset all state when a prop member changes",
      code: js`
        function ProfilePage({ user }) {
          const [comment, setComment] = useState('type something');

          useEffect(() => {
            setComment('type something');
          }, [user.id]);
        }
      `,
      errors: [
        {
          messageId: messageIds.avoidResettingStateFromProps,
          // TODO: Ideally would be "user.id"
          data: { prop: "user" },
        },
      ],
    },
    {
      name: "Reset all state when one of two props change",
      code: js`
        function ProfilePage({ userId, friends }) {
          const [comment, setComment] = useState('type something');

          useEffect(() => {
            setComment('type something');
          }, [userId, friends]);
        }
      `,
      errors: [
        {
          messageId: messageIds.avoidResettingStateFromProps,
          data: { prop: "userId" },
        },
      ],
    },
    {
      // These are equivalent because state initializes to `undefined` when it has no argument
      name: "Undefined state initializer compared to state setter with literal undefined",
      code: js`
        function List({ items }) {
          const [selectedItem, setSelectedItem] = useState();

          useEffect(() => {
            setSelectedItem(undefined);
          }, [items]);
        }
      `,
      errors: [
        {
          messageId: messageIds.avoidResettingStateFromProps,
        },
      ],
    },
    {
      // Valid wrt this flag - undefined !== null
      name: "Undefined state initializer compared to state setter with literal null",
      code: js`
        function List({ items }) {
          const [selectedItem, setSelectedItem] = useState();

          useEffect(() => {
            setSelectedItem(null);
          }, [items]);
        }
      `,
      errors: [
        {
          messageId: messageIds.avoidChainingState,
        },
      ],
    },
  ],
});
