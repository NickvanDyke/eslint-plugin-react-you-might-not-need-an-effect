import { MyRuleTester, js } from "./rule-tester.js";

// TODO: Figure out grouping for tests for readability
new MyRuleTester().run("/rule", {
  valid: [
    // TODO: Test case for called inside cleanup function? Is that legit?
  ],
  invalid: [
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
