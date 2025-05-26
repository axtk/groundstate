[![npm](https://flat.badgen.net/npm/v/groundstate?labelColor=345&color=46e)](https://www.npmjs.com/package/groundstate) [![Lightweight](https://flat.badgen.net/bundlephobia/minzip/groundstate/?labelColor=345&color=46e)](https://bundlephobia.com/package/groundstate) ![TypeScript ✓](https://flat.badgen.net/badge/TypeScript/✓?labelColor=345&color=345) ![SSR ✓](https://flat.badgen.net/badge/SSR/✓?labelColor=345&color=345)

# groundstate

*Minimalist shared state management for React apps*

- Similar to `useState()`
- No boilerplate
- Painless transition from local state to shared state and vice versa
- SSR-compatible

Installation: `npm i groundstate`

## Usage

Moving the local state to the full-fledged shared state:

```diff
  import {createContext, useContext} from 'react';
+ import {Store, useStore} from 'groundstate';
+
+ let AppContext = createContext(new Store(0));

  let Counter = () => {
-     let [counter, setCounter] = useState(0);
+     let [counter, setCounter] = useStore(useContext(AppContext));

      let handleClick = () => {
          setCounter(value => value + 1);
      };

      return <button onClick={handleClick}>{counter}</button>;
  };

  let ResetButton = () => {
-     let [, setCounter] = useState(0);
+     let [, setCounter] = useStore(useContext(AppContext), false);

      let handleClick = () => {
          setCounter(0);
      };

      return <button onClick={handleClick}>×</button>;
  };

  let App = () => <><Counter/>{' '}<ResetButton/></>;
```

[Live demo](https://codesandbox.io/p/sandbox/trcg3p?file=%2Fsrc%2FPlusButton.jsx)

🔹 The Groundstate's shared state setup is very similar to `useState()` allowing for quick migration from local state to shared state or the other way around.

🔹 The `false` parameter in `useStore(store, false)` (as in `<ResetButton>` above) tells the hook not to subscribe the component to tracking the store state updates. The common use case is when the component doesn't make use of the store state value, but it may use the state setter.

🔹 An application can have as many stores as needed, whether on a single React Context or multiple Contexts.

```js
let AppContext = createContext({
    users: new Store(/* ... */),
    items: new Store(/* ... */),
});
```

🔹 Apart from a boolean, `useStore(store, shouldUpdate)` can take a function of `(nextState, prevState) => boolean` as the second parameter to filter store updates to respond to:

```jsx
let ItemCard = ({id}) => {
    let hasRelevantUpdates = useCallback((nextItems, prevItems) => {
        return nextItems[id].revision !== prevItems[id].revision;
    }, [id]);

    let [items, setItems] = useStore(
        useContext(AppContext).items,
        hasRelevantUpdates,
    );

    return (
        // content
    );
};
```

🔹 Shared state can be provided to the app by means of a regular React Context provider:

```diff
  let App = () => (
-     <AppContext.Provider value={42}>
+     <AppContext.Provider value={new Store(42)}>
          <PlusButton/>{' '}<Display/>
      </AppContext.Provider>
  );
```

🔹 A store can contain data of any type.

Live demos:<br>
[Primitive value state](https://codesandbox.io/p/sandbox/trcg3p?file=%2Fsrc%2FPlusButton.jsx)<br>
[Object value state](https://codesandbox.io/p/sandbox/m2hnnr?file=%2Fsrc%2FPlusButton.jsx)

🔹 Immer can be used with `useStore()` just the same way as [with `useState()`](https://immerjs.github.io/immer/example-setstate#usestate--immer) to facilitate deeply nested data changes.

[Live demo with Immer](https://codesandbox.io/p/sandbox/flsh8h?file=%2Fsrc%2FPlusButton.jsx)

🔹 A store initialized outside a component can be used as the component's remount-persistent state.
