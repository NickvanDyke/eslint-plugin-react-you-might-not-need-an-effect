import { messageIds } from "../src/messages.js";
import { MyRuleTester, js } from "./rule-tester.js";

// Uses taken from the real world, as opposed to contrived examples
new MyRuleTester().run("/real-world", {
  valid: [
    {
      name: "Managing a timer",
      code: js`
        function Timer() {
          const [seconds, setSeconds] = useState(0);

          useEffect(() => {
            const interval = setInterval(() => {
              setSeconds((s) => s + 1);
            }, 1000);

            return () => { 
              clearInterval(interval); 
            }
          }, []);

          return <div>{seconds}</div>;
        }
      `,
    },
    {
      // https://github.com/NickvanDyke/eslint-plugin-react-you-might-not-need-an-effect/issues/11
      name: "Debouncing",
      code: js`
        function useDebouncedState(value, delay) {
          const [state, setState] = useState(value);
          const [debouncedState, setDebouncedState] = useState(value);

          useEffect(() => {
            const timeout = setTimeout(() => {
              setDebouncedState(state);
            }, delay);

            return () => {
              clearTimeout(timeout);
            };
          }, [delay, state]);

          return [state, debouncedState, setState];
        }
      `,
    },
    {
      name: "Listening for window events",
      code: js`
        function WindowSize() {
          const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });

          useEffect(() => {
            const handleResize = () => {
              setSize({ width: window.innerWidth, height: window.innerHeight });
            };

            window.addEventListener('resize', handleResize);

            return () => {
              window.removeEventListener('resize', handleResize);
            };
          }, []);

          return <div>{size.width} x {size.height}</div>;
        }
      `,
    },
    {
      name: "Play/pausing DOM video",
      // Could technically play/pause the video in the `onClick` handler,
      // but the use of an effect to sync state is arguably more readable and a valid use.
      code: js`
        function VideoPlayer() {
          const [isPlaying, setIsPlaying] = useState(false);
          const videoRef = useRef();

          useEffect(() => {
            if (isPlaying) {
              videoRef.current.play();
            } else {
              videoRef.current.pause();
            }
          }, [isPlaying]);

          return <div>
            <video ref={videoRef} />
            <button onClick={() => setIsPlaying((p) => !p)} />
          </div>
        }
      `,
    },
    {
      name: "Saving to LocalStorage",
      code: js`
        function Notes() {
          const [notes, setNotes] = useState(() => {
            const savedNotes = localStorage.getItem('notes');
            return savedNotes ? JSON.parse(savedNotes) : [];
          });

          useEffect(() => {
            localStorage.setItem('notes', JSON.stringify(notes));
          }, [notes]);

          return <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        }
      `,
    },
    {
      name: "Logging/Analytics",
      code: js`
        function Nav() {
          const [page, setPage] = useState('home');

          useEffect(() => {
            console.log("page viewed", page);
          }, [page]);

          return (
            <div>
              <button onClick={() => setPage('home')}>Home</button>
              <button onClick={() => setPage('about')}>About</button>
              <div>{page}</div>
            </div>
          )
        }
      `,
    },
    {
      // This might be a code smell, but people do it
      name: "JSON.stringifying in deps",
      code: js`
        function Feed() {
          const [posts, setPosts] = useState([]);
          const [scrollPosition, setScrollPosition] = useState(0);

          useEffect(() => {
            setScrollPosition(0);
            // We can't be sure JSON.stringify is pure, so we can't warn about this.
            // TODO: Technically we could check against known pure functions.
          }, [JSON.stringify(posts)]);
        }
      `,
    },
    {
      // Taken from https://github.com/linhnguyen-gt/react-native-phone-number-input/blob/b5e6dc652fa8a03609efb72607dc6866f5556ca3/src/countryPickerModal/CountryPicker.tsx
      name: "CountryPicker",
      code: js`
        function CountryPicker({ withEmoji }) {
          const { translation, getCountries } = useContext();

          const [state, setState] = useState({
            countries: [],
            selectedCountry: null,
          });
          const setCountries = (countries) => setState({ ...state, countries });

          useEffect(() => {
            let cancel = false;
            getCountries(translation)
              .then((countries) => (cancel ? null : setCountries(countries)))
              .catch(console.warn);

            return () => {
              cancel = true;
            };
          },
            // Important to the test: Leads us to find useStates to check their initializers
            [translation, withEmoji]
          );
        }
      `,
    },
    {
      // https://github.com/NickvanDyke/eslint-plugin-react-you-might-not-need-an-effect/issues/10
      name: "navigation.setOptions",
      code: js`
        import { useNavigation } from '@react-navigation/native';
        import { useState, useLayoutEffect } from 'react';

        function ProfileScreen({ route }) {
          const navigation = useNavigation();
          const [value, onChangeText] = React.useState(route.params.title);

          React.useLayoutEffect(() => {
            navigation.setOptions({
              title: value === '' ? 'No title' : value,
            });
          }, [navigation, route]);
        }
      `,
    },
    {
      // https://github.com/NickvanDyke/eslint-plugin-react-you-might-not-need-an-effect/issues/9#issuecomment-2913950378
      name: "Keyboard state listener",
      code: js`
        import { useEffect, useState } from 'react';
        import keyboardReducer from './reducers';

        let globalKeyboardState = {
          recentlyUsed: []
        };

        export const keyboardStateListeners = new Set();

        const setKeyboardState = (action) => {
          globalKeyboardState = keyboardReducer(globalKeyboardState, action);
          keyboardStateListeners.forEach((listener) => listener(globalKeyboardState));
        };

        export const useKeyboardStore = () => {
          const [keyboardState, setState] = useState(globalKeyboardState);

          useEffect(() => {
            const listener = () => setState(globalKeyboardState);
            keyboardStateListeners.add(listener);
            return () => {
              keyboardStateListeners.delete(listener);
            };
          }, [keyboardState]);

          return { keyboardState, setKeyboardState };
        };

        useKeyboardStore.setKeyboardState = setKeyboardState;
      `,
    },
  ],
  invalid: [
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
          // TODO: Because the initial state is internal, derived state would be a better flag.
          messageId: messageIds.avoidResettingStateFromProps,
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
          messageId: messageIds.avoidEventHandler,
        },
      ],
    },
  ],
});
