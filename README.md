# groundstate

Minimalist shared state management for React apps

- Easy to set up, similar to `useState()`, no boilerplate code
- Painless transition from local state to shared state and vice versa
- SSR-compatible

Installation: `npm i groundstate`

## Shared state

Let's assume we've got two components with counters in their local states provided by React's `useState()`. Both counters are isolated from each other. Now, let's share a single counter value between these components:

```diff
  import {createContext, useContext} from 'react';
+ import {Store, useStore} from 'groundstate';
+
+ let AppContext = createContext(new Store(0));

  let Display = () => {
-     let [counter] = useState(0); // somewhat contrived, never updated
+     let [counter] = useStore(useContext(AppContext));

      return <span>{counter}</span>;
  };

  let PlusButton = () => {
-     let [, setCounter] = useState(0);
+     let [, setCounter] = useStore(useContext(AppContext), false);

      let handleClick = () => {
          setCounter(value => value + 1);
      };

      return <button onClick={handleClick}>+</button>;
  };

  let App = () => <><PlusButton/>{' '}<Display/></>;
```

[Live demo](https://codesandbox.io/p/sandbox/trcg3p?file=%2Fsrc%2FPlusButton.jsx)

With these few edits (React Context + `Store` + `useStore()`), we transformed the local state into the full-fledged shared state. Whenever the counter is incremented by clicking `PlusButton`, the `Display` component gets notified and updated with the new counter value. Note that the interaction with the state remains intact.

The example above shows the essential parts of the Groundstate's shared state setup. The `Store` class serves as a container for the shared state value (`new Store(0)` in the code block above) that provides a way to access and modify this value, while the `useStore()` hook unpacks the shared state value and subscribes the component to its updates (with an option to [fine-tune](#responsiveness-to-store-updates) this subscription).

### Painless transition from local state to shared state and vice versa

In the example above, we only had to edit the initialization part of the state value, the rest of the interaction with the value remains the same as with React's `useState()`. This makes the transition from local state to shared state and the other way around nearly effortless.

The effort cost of this transition really matters since shared state is a very common part of web apps and it often evolves from local state. The Groundstate's shared state setup helps reduce the effort of migrating from local state to shared state (or vice versa) to a minimum.

### Responsiveness to store updates

In the example above, `useStore()` in `PlusButton` has the second parameter set to `false`. This is a way to tell the hook not to re-render the component when the store gets updated. Unlike `Display`, `PlusButton` doesn't use the `counter` value, so it doesn't need to track the store updates.

Apart from a boolean value, the second parameter of `useStore()` can also be a function of `(nextState, prevState)` returning a boolean, allowing for subtler fine-tuning of responsiveness to store updates. For more details, see [Filtering store updates](#filtering-store-updates).

### Store provider

A Groundstate store can live in a regular React Context. In the example above, there's no explicit Context Provider: the components make use of the default Context value passed to `createContext()`. In more complex setups (especially with SSR), an appropriate Context Provider can be added to specify the initial state:

```diff
  let App = () => (
-     <AppContext.Provider value={42}>
+     <AppContext.Provider value={new Store(42)}>
          <PlusButton/>{' '}<Display/>
      </AppContext.Provider>
  );
```

A store is picked from the Context just like any other value on a Context. The Context may as well contain other non-store items alongside stores if need be. A store (whether from the Context or elsewhere) is then passed to the `useStore()` hook to unpack the current store state and subscribe the component to the store updates.

### Store data

In the example above, an instance of the `Store` class contains a primitive value, but there can be data of any type.

Live demos:<br>
[Primitive value state](https://codesandbox.io/p/sandbox/trcg3p?file=%2Fsrc%2FPlusButton.jsx)<br>
[Object value state](https://codesandbox.io/p/sandbox/m2hnnr?file=%2Fsrc%2FPlusButton.jsx)

### Multiple stores

An application can have as many stores as needed, whether on a single Context or multiple Contexts.

Splitting the app data into multiple stores
- makes the scopes of the stores clearer,
- helps reduce irrelevant update notifications in the components requiring only a limited portion of the data.

```jsx
let AppContext = createContext({
    users: new Store(/* ... */),
    articles: new Store(/* ... */),
});

let UserCard = ({userId}) => {
    let [users, setUsers] = useStore(useContext(AppContext).users);

    // rendering
};
```

In this example, the `UserCard` component uses only the `users` store from `AppContext`. It won't be re-rendered if the contents of the `articles` store gets updated (just as intended).

Note that the `users` store is picked from the Context just like any other value inside a Context.

## Filtering store updates

As previously mentioned, although not a requirement, one way to reduce component updates in response to shared state updates is to split the shared data into a number of more scoped stores.

Let's assume again we've got a component that uses a store from the following store setup (the number of stores doesn't really matter here, it can be one store or multiple stores):

```jsx
let AppContext = createContext({
    users: new Store(/* ... */),
    articles: new Store(/* ... */),
});
```

As either store from this setup grows larger, we may want to filter incoming store updates in the component in a more granular fashion, beyond splitting the data into the two stores. Below, we'll add the second parameter to the `useStore()` hook to tell it when to respond to the `users` store updates. We'll assume that the `users` store contains an id-value map of user objects, each with its own `lastModified` timestamp.

```diff
  let UserCard = ({userId}) => {
      let [users, setUsers] = useStore(
          useContext(AppContext).users,
+         useCallback((nextUsers, prevUsers) => {
+            return nextUsers[userId].lastModified > prevUsers[userId].lastModified;
+         }, [userId]),
      );

      // rendering
  };
```

Now, the `UserCard` component will only respond to the `users` store changes if the `lastModified` timestamp in the `userId` entry has changed. Depending on the data, we could instead provide another filter function like comparing a `revision` field value (if there was one) or carrying out deep comparison of the next and previous user values.

For the sake of readability, we may want to move such a filter function to a separate file, especially if it recurs across multiple parts of the application:

```js
import {useCallback} from 'react';

export function useChangeByLastModified(id) {
    return useCallback((nextState, prevState) => {
        return nextState[id].lastModified > prevState[id].lastModified;
    }, [id]);
}
```

```diff
+ import {useChangeByLastModified} from './useChangeByLastModified';

  let UserCard = ({userId}) => {
      let [users, setUsers] = useStore(
          useContext(AppContext).users,
+         useChangeByLastModified(userId),
      );

      // rendering
  };
```

**Recap**: With a larger store, the number of the component's updates in response to the store updates can be reduced by providing a filter function of `(nextState, prevState)` as the optional second parameter of the `useStore()` hook.

## Persistent local state

### State persistence across remounts

Maintaining local state of a component with the React's `useState()` hook is commonplace and works fine for many cases, but it has its downsides in the popular scenarios:

- the updated state from `useState()` is lost whenever the component unmounts, and
- setting the state in an asynchronous callback after the component gets unmounted causes an error that requires extra handling.

Both of these issues can be addressed by using a store created outside of the component instead of `useState()`. Such a store doesn't have to be shared with other components (although it's also possible) and it will act as:

- local state persistent across remounts, and
- unmount-safe storage for asynchronously fetched data.

```diff
+ let itemStore = new Store();

  let List = () => {
-     let [items, setItems] = useState();
+     let [items, setItems] = useStore(itemStore);

      useEffect(() => {
          if (items !== undefined)
              return;

          fetch('/items')
              .then(res => res.json())
              .then(items => setItems(items));
      }, [items]);

      // ... rendering
  };
```

In the example above, if the request completes after the component has unmounted the fetched data will be safely put into `itemStore` and this data will be reused when the component remounts without fetching it again.

### State persistence across page reloads

`itemStore` from the example above can be further modified to make the component state persistent across page reloads without affecting the component's internals.

```js
let initialState;

try {
    initialState = JSON.parse(localStorage.getItem('itemStore'));
}
catch {}

export let itemStore = new Store(initialState);

itemStore.subscribe(nextState => {
    localStorage.setItem('itemStore', JSON.stringify(nextState));
});
```

```jsx
import {itemStore} from './itemStore';

let List = () => {
    let [items, setItems] = useStore(itemStore);

    // ...
};
```

## Direct subscription to store updates

For some purposes (like logging or debugging the data flow), it might be helpful to directly subscribe to state updates. This can be achieved with the store's `subscribe()` method:

```jsx
let App = () => {
    let store = useContext(AppContext);

    useEffect(() => {
        // `subscribe()` returns an unsubscription function which
        // works as a cleanup function in the effect.
        return store.subscribe((nextState, prevState) => {
            console.log({nextState, prevState});
        });
    }, [store]);

    // ...
};
```

## Adding *immer*

*immer* is not part of this package but it can be used with `useStore()` just the same way as [with `useState()`](https://immerjs.github.io/immer/example-setstate#usestate--immer) to facilitate deeply nested data changes.

[Live demo with *immer*](https://codesandbox.io/p/sandbox/flsh8h?file=%2Fsrc%2FPlusButton.jsx)
