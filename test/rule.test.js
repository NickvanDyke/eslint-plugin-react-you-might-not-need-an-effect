import { MyRuleTester } from "./rule-tester.js";
const js = String.raw;

// TODO: Figure out grouping for tests for readability
new MyRuleTester().run("/rule", {
  valid: [
    {
      name: "Empty effect",
      code: js`
        function Component() {
          useEffect(() => {}, []);
        }
      `,
    },
    {
      name: "Computed state from other state",
      code: js`
        function Form() {
          const [firstName, setFirstName] = useState('Taylor');
          const [lastName, setLastName] = useState('Swift');

          const fullName = firstName + ' ' + lastName;
        }
      `,
    },
    {
      name: "Computed state from props",
      code: js`
        function TodoList({ todos, filter }) {
          const [newTodo, setNewTodo] = useState('');
          const visibleTodos = getFilteredTodos(todos, filter);
        }
      `,
    },
    {
      name: "Two components with overlapping names",
      // Not a super realistic example
      code: js`
        function One() {
          const [data, setData] = useState();
        }

        function Two() {
          const setData = (data) => {
            console.log(data);
          }

          useEffect(() => {
            setData('hello');
          }, []);
        }
      `,
    },
    {
      name: "Updating state from external state change",
      code: js`
        function Feed() {
          const { data: posts } = useQuery('/posts');
          const [scrollPosition, setScrollPosition] = useState(0);

          useEffect(() => {
            setScrollPosition(0);
          }, [posts]);
        }
      `,
    },
    {
      name: "Deriving state from external state change, with multiple calls to setter",
      code: js`
        function Feed() {
          const { data: posts } = useQuery('/posts');
          const [selectedPost, setSelectedPost] = useState();

          useEffect(() => {
            setSelectedPost(posts[0]);
          }, [posts]);

          return (
            <div>
              {posts.map((post) => (
                <div key={post.id} onClick={() => setSelectedPost(post)}>
                  {post.title}
                </div>
              ))}
            </div>
          )
        }
      `,
    },
    {
      name: "Fetching external state on mount",
      code: js`
        function Form() {
          const [data, setData] = useState();

          useEffect(() => {
            fetchData().then((data) => {
              setData(data);
            });
          }, []);
        }
      `,
    },
    {
      name: "Syncing external state",
      // Technically we could trigger the network call in `input.onChange`,
      // but the use of an effect to sync state is arguably more readable and a valid use.
      // Especially when we already store the input's controlled state.
      code: js`
        function Search() {
          const [query, setQuery] = useState();
          const [data, setData] = useState();

          useEffect(() => {
            fetchData(query).then((data) => {
              setData(data);
            });
          }, [query]);

          return (
            <input
              name="query"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          )
        }
      `,
    },
    {
      name: "Subscribing to external state",
      code: js`
        function Status() {
          const [status, setStatus] = useState();

          useEffect(() => {
            const unsubscribe = subscribeToStatus(topic, (status) => {
              setStatus(status);
            });

            return () => unsubscribe();
          }, [topic]);

          return <div>{status}</div>;
        }
      `,
    },
    {
      name: "Deriving state with external function",
      code: js`
        function TodoList({ todos, filter }) {
          const [newTodo, setNewTodo] = useState("");
          const [visibleTodos, setVisibleTodos] = useState([]);

          useEffect(() => {
            // We can't be sure getFilteredTodos is pure, so we can't warn about this
            setVisibleTodos(getFilteredTodos(todos, filter));
          }, [todos, filter]);
        }
      `,
    },
    {
      name: "Passing non-anonymous function to effect",
      code: js`
        function Form({ onClose }) {
          const [name, setName] = useState();
          const [isOpen, setIsOpen] = useState(true);

          useEffect(onClose, [isOpen]);
        }
      `,
    },
    {
      name: "Deriving state from intermediate external state with multiple calls to setter",
      code: js`
        function Form() {
          const name = useQuery('/name');
          const [fullName, setFullName] = useState('');

          useEffect(() => {
            const prefixedName = 'Dr. ' + name;
            setFullName(prefixedName) 
          }, [name]);

          return (
            <input
              name="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          )
        }
      `,
    },
    {
      name: "Variable name shadows state name",
      code: js`
        function CountrySelect({ translation }) {
          const [countries, setCountries] = useState();

          useEffect(() => {
            // Verify that the shadowing variable is not considered a state ref
            const countries = getCountries(translation);
            setCountries(countries);
          },
            // Important to the test: Leads us to check useState initializers,
            // so we can verify that we don't try to find a useState for the shadowing variable
            [translation]
          );
        }
      `,
    },
    // TODO: Test case for called inside cleanup function? Is that legit?
  ],
  invalid: [
    {
      name: "Deriving state from other state",
      code: js`
        function Form() {
          const [firstName, setFirstName] = useState('Taylor');
          const [lastName, setLastName] = useState('Swift');

          const [fullName, setFullName] = useState('');
          useEffect(() => setFullName(firstName + ' ' + lastName), [firstName, lastName]);
        }
      `,
      errors: [
        {
          messageId: "avoidInternalEffect",
        },
        {
          messageId: "avoidDerivedState",
          data: { state: "fullName" },
        },
      ],
    },
    {
      name: "Deriving state from intermediate internal state",
      code: js`
        function Form() {
          const [firstName, setFirstName] = useState('Taylor');
          const [lastName, setLastName] = useState('Swift');
          const [fullName, setFullName] = useState('');

          useEffect(() => {
            const name = firstName + ' ' + lastName;
            setFullName(name) 
          }, [firstName, lastName]);
        }
      `,
      errors: [
        {
          messageId: "avoidInternalEffect",
        },
        {
          messageId: "avoidDerivedState",
          data: { state: "fullName" },
        },
      ],
    },
    {
      name: "Deriving state from intermediate internal state outside effect",
      code: js`
        function Form() {
          const [firstName, setFirstName] = useState('Taylor');
          const [lastName, setLastName] = useState('Swift');
          const [fullName, setFullName] = useState('');
          const name = firstName + ' ' + lastName;

          useEffect(() => {
            setFullName(name) 
          }, [name]);
        }
      `,
      errors: [
        {
          messageId: "avoidInternalEffect",
        },
        {
          messageId: "avoidDerivedState",
          data: { state: "fullName" },
        },
      ],
    },
    {
      name: "Deriving state from props",
      code: js`
        function Form({ firstName, lastName }) {
          const [fullName, setFullName] = useState('');

          useEffect(() => {
            setFullName(firstName + ' ' + lastName);
          }, [firstName, lastName]);
        }
      `,
      errors: [
        {
          messageId: "avoidInternalEffect",
        },
        {
          messageId: "avoidDerivedState",
          data: { state: "fullName" },
        },
      ],
    },
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
        // TODO: Surely there's a more specific error?
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
      // NOTE: Assumes the function is pure because it's called on state
      name: "Deriving state from props via function",
      code: js`
        function DoubleList({ list }) {
          const [doubleList, setDoubleList] = useState([]);

          useEffect(() => {
            // list.concat is a call expression, but it's
            // considered a prop call, thus still internal
            setDoubleList(list.concat(list));
          }, [list]);
        }
      `,
      errors: [
        {
          messageId: "avoidInternalEffect",
        },
        {
          messageId: "avoidDerivedState",
          data: { state: "doubleList" },
        },
      ],
    },
    {
      // NOTE: Assumes the function is pure because it's called on state
      name: "Deriving state from other state via function",
      code: js`
        function DoubleList() {
          const [list, setList] = useState([]);
          const [doubleList, setDoubleList] = useState([]);

          useEffect(() => {
            setDoubleList(list.concat(list));
          }, [list]);
        }
      `,
      errors: [
        {
          messageId: "avoidInternalEffect",
        },
        {
          messageId: "avoidDerivedState",
          data: { state: "doubleList" },
        },
      ],
    },
    {
      // NOTE: Assumes the function is pure because it's called on state
      name: "Mutating state in effect",
      code: js`
        function DoubleList() {
          const [list, setList] = useState([]);
          const [doubleList, setDoubleList] = useState([]);

          useEffect(() => {
            doubleList.push(...list);
          }, [list]);
        }
      `,
      errors: [
        {
          messageId: "avoidInternalEffect",
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
      name: "Deriving state from external state, with single call to setter",
      todo: true,
      code: js`
        function Feed() {
          const { data: posts } = useQuery('/posts');
          const [selectedPost, setSelectedPost] = useState();

          useEffect(() => {
            // This is the only place that modifies the state,
            // thus they will always be in sync and it could be computed during render
            setSelectedPost(posts[0]);
          }, [posts]);
        }
      `,
      errors: [
        {
          messageId: "avoidDerivedState",
          data: { state: "selectedPost" },
        },
      ],
    },
    {
      name: "Deriving state from intermediate external state with single call to setter",
      todo: true,
      code: js`
        function Form() {
          const name = useQuery('/name');
          const [fullName, setFullName] = useState('');

          useEffect(() => {
            const prefixedName = 'Dr. ' + name;
            setFullName(prefixedName) 
          }, [name]);
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
      name: "Deriving state with setter callback",
      todo: true,
      code: js`
        function CountAccumulator({ count }) {
          const [total, setTotal] = useState(count);

          useEffect(() => {
            setTotal((prev) => prev + count);
          }, [count]);
        }
      `,
      errors: [
        {
          messageId: "avoidInternalEffect",
        },
        {
          messageId: "avoidDerivedState",
          data: { state: "total" },
        },
      ],
    },
    {
      name: "Partially updating complex state object with derived state",
      code: js`
        function Form({ firstName, lastName }) {
          const [formData, setFormData] = useState({
            title: 'Dr.',
            fullName: '',
          });

          useEffect(() => {
            setFormData({
              ...formData,
              fullName: firstName + ' ' + lastName,
            });
          }, [firstName, lastName, formData]);
        }
      `,
      errors: [
        {
          messageId: "avoidInternalEffect",
        },
        {
          messageId: "avoidDerivedState",
          data: { state: "formData" },
        },
      ],
    },
    {
      name: "Partially updating complex state object with setter callback and derived state",
      todo: true,
      code: js`
        function Form({ firstName, lastName }) {
          const [formData, setFormData] = useState({
            title: 'Dr.',
            fullName: '',
          });

          useEffect(() => {
            setFormData((prev) => ({
              ...prev,
              fullName: firstName + ' ' + lastName,
            }));
          }, [firstName, lastName]);
        }
      `,
      errors: [
        {
          messageId: "avoidInternalEffect",
        },
        {
          messageId: "avoidDerivedState",
          data: { state: "formData" },
        },
      ],
    },
    {
      name: "Partially updating complex state object with intermediate setter and derived state",
      code: js`
        function Form({ firstName, lastName }) {
          const [formData, setFormData] = useState({
            title: 'Dr.',
            fullName: '',
          });

          const setFullName = (fullName) => setFormData({ ...formData, fullName });

          useEffect(() => {
            setFormData({
              ...formData,
              fullName: firstName + ' ' + lastName,
            });
          }, [firstName, lastName, formData]);
        }
      `,
      errors: [
        {
          messageId: "avoidInternalEffect",
        },
        {
          messageId: "avoidDerivedState",
          data: { state: "formData" },
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
