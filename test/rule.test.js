import { MyRuleTester } from "./rule-tester.js";
const js = String.raw;

// TODO: Figure out grouping for tests for readability
new MyRuleTester().run("/rule", {
  valid: [
    // TODO: Test case for called inside cleanup function? Is that legit?
  ],
  invalid: [
    {
      // TODO: Test with intermediate state too
      name: "Passing internal state to parent",
      code: js`
        const Child = ({ onFetched }) => {
          const [data, setData] = useState();

          useEffect(() => {
            onFetched(data);
          }, [onFetched, data]);
        }
      `,
      errors: [
        {
          messageId: "avoidInternalEffect",
        },
        {
          messageId: "avoidPassingStateToParent",
        },
      ],
    },
    {
      name: "Passing internal state to parent via derived prop callback",
      code: js`
        const Child = ({ onFetched }) => {
          const [data, setData] = useState();
          // No idea why someone would do this, but hey we can catch it
          const onFetchedWrapper = onFetched

          useEffect(() => {
            onFetchedWrapper(data);
          }, [onFetched, data]);
        }
      `,
      errors: [
        {
          messageId: "avoidInternalEffect",
        },
        {
          messageId: "avoidPassingStateToParent",
        },
      ],
    },
    {
      name: "Passing external live state to parent",
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
          messageId: "avoidPassingStateToParent",
        },
      ],
    },
    {
      name: "Passing external final state to parent",
      code: js`
        function Form({ onSubmit }) {
          const [name, setName] = useState();
          const [dataToSubmit, setDataToSubmit] = useState();

          useEffect(() => {
            onSubmit(dataToSubmit);
          }, [dataToSubmit]);

          return (
            <div>
              <input
                name="name"
                type="text"
                onChange={(e) => setName(e.target.value)}
              />
              <button onClick={() => setDataToSubmit({ name })}>Submit</button>
            </div>
          )
        }
      `,
      errors: [
        {
          messageId: "avoidInternalEffect",
        },
        {
          // Ideally we warn about using state as an event handler, but not sure how to differentiate that.
          messageId: "avoidPassingStateToParent",
        },
      ],
    },
    {
      name: "Calling prop in response to prop change",
      code: js`
        function Form({ isOpen, events }) {

          useEffect(() => {
            if (!isOpen) {
              events.onClose();
            }
          }, [isOpen]);
        }
      `,
      errors: [
        {
          messageId: "avoidInternalEffect",
        },
        {
          messageId: "avoidManagingParentBehavior",
        },
      ],
    },
    //  TODO: How to detect this though? Not sure it's discernable from legit synchronization effects.
    //  Maybe when the setter is only called in this one place? Meaning we could instead inline the effect.
    // {
    //   name: "Using state to handle an event",
    //   code: js`
    //     function Form() {
    //       const [name, setName] = useState();
    //       const [dataToSubmit, setDataToSubmit] = useState();
    //
    //       useEffect(() => {
    //         submitData(dataToSubmit);
    //       }, [dataToSubmit]);
    //
    //       return (
    //         <div>
    //           <input
    //             name="name"
    //             type="text"
    //             onChange={(e) => setName(e.target.value)}
    //           />
    //           <button onClick={() => setDataToSubmit({ name })}>Submit</button>
    //         </div>
    //       )
    //     }
    //   `,
    //   errors: [
    //     {
    //       messageId: "avoidEventHandler",
    //     },
    //   ],
    // },
    {
      name: "Using state to trigger no-arg prop callback",
      code: js`
        function Form({ onClose }) {
          const [name, setName] = useState();
          const [isOpen, setIsOpen] = useState(true);

          useEffect(() => {
            onClose();
          }, [isOpen]);

          return (
            <button onClick={() => setIsOpen(false)}>Submit</button>
          )
        }
      `,
      errors: [
        {
          messageId: "avoidInternalEffect",
        },
        // TODO: Is `avoidPassingStateToParent` still appropriate here? Similar issue.
        // Maybe we could rename the message to make sense here too.
      ],
    },
    {
      // React docs recommend to first update state in render instead of an effect.
      // But then continue on to say that usually you can avoid the sync entirely by
      // more wisely choosing your state. So we'll just always warn about chained state.
      name: "Syncing prop changes to internal state",
      code: js`
        function List({ items }) {
          const [selection, setSelection] = useState();

          useEffect(() => {
            setSelection(null);
          }, [items]);

          return (
            <div>
              {items.map((item) => (
                <div key={item.id} onClick={() => setSelection(item)}>
                  {item.name}
                </div>
              ))}
            </div>
          )
        }
      `,
      errors: [
        {
          messageId: "avoidInternalEffect",
        },
        {
          messageId: "avoidChainingState",
        },
      ],
    },
    {
      name: "Resetting some state when a prop changes",
      code: js`
        function ProfilePage({ userId }) {
          const [user, setUser] = useState(null);
          const [comment, setComment] = useState('type something');
          // const [catName, setCatName] = useState('Sparky');

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
    {
      name: "Resetting all state when a prop changes",
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
        {
          messageId: "avoidChainingState",
        },
        {
          messageId: "avoidChainingState",
        },
      ],
    },
    {
      name: "Conditionally reacting to state to set other state",
      code: js`
        function Form() {
          const [error, setError] = useState();
          const [result, setResult] = useState();

          useEffect(() => {
            if (result.data) {
              setError(null);
            }
          }, [result]);
        }
      `,
      errors: [
        {
          messageId: "avoidInternalEffect",
        },
        {
          messageId: "avoidChainingState",
        },
      ],
    },
    {
      name: "Derived state in larger, otherwise legit effect",
      todo: true,
      code: js`
        function Form() {
          const [firstName, setFirstName] = useState('Taylor');
          const [lastName, setLastName] = useState('Swift');

          const [fullName, setFullName] = useState('');
          useEffect(() => {
            const name = firstName + ' ' + lastName;
            setFullName(name);
            console.log(name);
          }, [firstName, lastName]);
        }
      `,
      errors: [
        {
          messageId: "avoidDerivedState",
          data: { state: "fullName" },
        },
      ],
    },
    {
      name: "Using prop in state initializer",
      code: js`
        function List({ items }) {
          // Verify that 'setSelection' is not considered a prop ref
          // just because 'items' is on its definition path.
          const [selection, setSelection] = useState(items[0]);

          useEffect(() => {
            setSelection(null);
          }, [items]);
        }
      `,
      errors: [
        {
          messageId: "avoidInternalEffect",
        },
        {
          messageId: "avoidChainingState",
        },
      ],
    },
  ],
});
