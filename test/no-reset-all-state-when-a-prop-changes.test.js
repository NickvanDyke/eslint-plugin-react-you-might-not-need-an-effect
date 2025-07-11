import {
  rule,
  messages,
  name,
} from "../src/no-reset-all-state-when-a-prop-changes.js";
import { MyRuleTester, js } from "./rule-tester.js";

new MyRuleTester().run(name, rule, {
  valid: [
    {
      name: "Set state when a prop changes, but not to its default value",
      code: js`
        function List({ items }) {
          const [selection, setSelection] = useState();

          useEffect(() => {
            setSelection(items[0]);
          }, [items]);
        }
      `,
    },
    {
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
    },
    {
      // undefined !== null
      name: "Undefined state initializer compared to state setter with literal null",
      code: js`
        function List({ items }) {
          const [selectedItem, setSelectedItem] = useState();

          useEffect(() => {
            setSelectedItem(null);
          }, [items]);
        }
      `,
    },
  ],
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
          messageId: messages.avoidResettingAllStateWhenAPropChanges,
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
          messageId: messages.avoidResettingAllStateWhenAPropChanges,
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
          messageId: messages.avoidResettingAllStateWhenAPropChanges,
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
          messageId: messages.avoidResettingAllStateWhenAPropChanges,
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
          messageId: messages.avoidResettingAllStateWhenAPropChanges,
        },
      ],
    },
    {
      // https://github.com/NickvanDyke/eslint-plugin-react-you-might-not-need-an-effect/issues/8
      name: "Meow",
      code: js`
        const ExternalAssetItemRow = memo(
          ({
            id,
            title,
            exportIdentifier,
            localId,
            hasUpdate,
            isViewOnly,
            getMenuOptions,
            onUpdate,
            onDragStart,
            Icon,
            exitMode,
          }) => {
            const [shouldUpdate, setShouldUpdate] = useState(hasUpdate);

            useEffect(() => {
              setShouldUpdate(hasUpdate);
            }, [hasUpdate]);

            const onClickUpdate = useCallback(
              (event) => {
                event.stopPropagation();

                if (isViewOnly) return;

                setShouldUpdate(false);
              },
              [onUpdate, exportIdentifier, title, isViewOnly],
            );

            const handleDragStart = useCallback(
              (event) => {
                exitMode();
                onDragStart(event, exportIdentifier);
              },
              [onDragStart, exportIdentifier],
            );

            const getMenu = useCallback(
              (id) => getMenuOptions(id, exportIdentifier, title, localId),
              [getMenuOptions, exportIdentifier, title, localId],
            );

            return (
              <Draggable
                  hideDragSource={false}
                  onDragStart={handleDragStart}
                  onMouseDown={onMouseDown}
                  autoScrollEnabled={false}
              >
              </Draggable>
            )
          },
        );
      `,
      errors: [
        {
          messageId: messages.avoidResettingAllStateWhenAPropChanges,
        },
      ],
    },
  ],
});
