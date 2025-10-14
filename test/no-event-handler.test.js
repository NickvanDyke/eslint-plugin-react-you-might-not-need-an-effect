import rule from "../src/rules/no-event-handler.js";
import { MyRuleTester, js } from "./rule-tester.js";

new MyRuleTester().run("no-event-handler", rule, {
  valid: [
    {
      name: "Sychronizing with external system",
      code: js`
        function Search() {
          const [query, setQuery] = useState();
          const [results, setResults] = useState();

          useEffect(() => {
            fetch('/search?query=' + query).then((data) => {
              setResults(data);
            });
          }, [query]);

          return (
            <div>
              <input
                name="query"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <ul>
                {results.map((result) => (
                  <li key={result.id}>{result.title}</li>
                ))}
              </ul>
            </div>
          )
        }
      `,
    },
    {
      name: "If test includes non-state",
      code: js`
        function Form() {
          const [name, setName] = useState();
          const [dataToSubmit, setDataToSubmit] = useState();

          useEffect(() => {
            if (dataToSubmit && Date.now() % 2 === 0) {
              submitData(dataToSubmit);
            }
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
    },
    {
      name: "Using prop to handle an event and call a prop",
      code: js`
        function Form({ dataToSubmit, submitData }) {
          useEffect(() => {
            if (dataToSubmit) {
              submitData(dataToSubmit);
            }
          }, [dataToSubmit]);
        }
      `,
    },
  ],
  invalid: [
    {
      name: "Using state to handle an event and call an external function",
      code: js`
        function Form() {
          const [name, setName] = useState();
          const [dataToSubmit, setDataToSubmit] = useState();

          useEffect(() => {
            if (dataToSubmit) {
              submitData(dataToSubmit);
            }
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
          messageId: "avoidEventHandler",
        },
      ],
    },
    {
      name: "Using state to handle an event and call a prop",
      code: js`
        function Form({ submitData }) {
          const [name, setName] = useState();
          const [dataToSubmit, setDataToSubmit] = useState();

          useEffect(() => {
            if (dataToSubmit) {
              submitData(dataToSubmit);
            }
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
          messageId: "avoidEventHandler",
        },
      ],
    },
    {
      name: "Early return in if test",
      code: js`
        function Form() {
          const [name, setName] = useState();
          const [dataToSubmit, setDataToSubmit] = useState();

          useEffect(() => {
            if (!dataToSubmit) return;

            submitData(dataToSubmit);
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
          messageId: "avoidEventHandler",
        },
      ],
    },
    {
      name: "More complex if test",
      code: js`
        function Form() {
          const [name, setName] = useState();
          const [dataToSubmit, setDataToSubmit] = useState();

          useEffect(() => {
            if (dataToSubmit.name && dataToSubmit.name.length > 0) {
              submitData(dataToSubmit);
            }
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
          messageId: "avoidEventHandler",
        },
      ],
    },
    {
      // https://github.com/NickvanDyke/eslint-plugin-react-you-might-not-need-an-effect/issues/7
      name: "Klarna",
      code: js`
        function Klarna({ klarnaAppId }) {
          const [countryCode] = useState(qs.parse('countryCode=meow'));
          const [result, setResult] = useState();
          const klarnaEnabled = useSelector('idk') && shouldKlarnaBeEnabled(countryCode);
          const currentLocale = getCurrentLocale(useGetCurrentLanguage());

          const loadSignInWithKlarna = (klarnaAppId, klarnaEnvironment, countryCode, currentLocale) => {
            const klarnaResult = doSomething();
            setResult(klarnaResult);
          };

          useEffect(() => {
            if (klarnaEnabled) {
              return loadSignInWithKlarna(
                  klarnaAppId,
                  klarnaEnvironment,
                  countryCode?.toUpperCase(),
                  currentLocale,
              );
            }
          }, [
            countryCode,
            klarnaAppId,
            klarnaEnabled,
            klarnaEnvironment,
            currentLocale,
          ]);
        }
      `,
      errors: [
        {
          messageId: "avoidEventHandler",
        },
      ],
    },
  ],
});
