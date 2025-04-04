# groundstate

Minimalist shared state management for React apps

- Easy to set up, similar to `useState()`, no boilerplate code
- Painless transition from local state to shared state and vice versa
- SSR-compatible

Installation: `npm i groundstate`

## Shared state

Let's take two components containing counters stored in their local states via React's `useState()`, isolated from each other. Let's see what should be edited to share the counter between these components.

```diff
import {createContext, useContext} from 'react';
+ import {Store, useStore} from 'groundstate';

+ let AppContext = createContext(new Store(0));

let Display = () => {
-   let [counter] = useState(0); // somewhat contrived, never updated
+   let [counter] = useStore(useContext(AppContext));

    return <span>{counter}</span>;
};

let PlusButton = () => {
-   let [, setCounter] = useState(0);
+   let [, setCounter] = useStore(useContext(AppContext), false);

    let handleClick = () => {
        setCounter(value => value + 1);
    };

    return <button onClick={handleClick}>+</button>;
};

let App = () => <><PlusButton/>{' '}<Display/></>;
```

[Live demo](https://codesandbox.io/p/sandbox/trcg3p?file=%2Fsrc%2FPlusButton.jsx)

After the edits, whenever the counter is updated by clicking `PlusButton`, `Display` gets notified and re-rendered with the new counter value.

### Closer look at the setup

The simple example above shows the essential parts of the shared state setup. The `Store` class that wraps the shared state value (`new Store(0)` in the code snippet above) provides a way to access and modify the shared state value, and the `useStore()` hook unpacks the shared state value and subscribes the component to its updates (with an option to [fine-tune](#responsiveness-to-store-updates) this subscription).

The instance of the `Store` class sits in a React Context (whether in the value of an explicit Context Provider or in the Context's default value). After the initialization, the reference to the store instance is never updated. The store's state setter (like `setCounter()` in the example above) only updates the store's state value, not the store instance itself. Which means that store state updates don't trigger re-renders in the entire Context. Only the components that explicitly subscribe to updates in the particular store with the `useStore()` hook will be urged to update in response to the store updates. React might still decide to bail out of a component update if the store state value hasn't actually changed to affect the virtual DOM (which is fine to leave this part to React, like with all other component updates).

### Painless transition from local state to shared state and vice versa

Note that in the example above we only had to edit the initialization part of the state value, the rest of the interaction with the value remains the same. This makes the transition from local state to shared state and the other way around nearly effortless (compared to many other approaches to shared state out there).

The easiness of such transition really matters since shared state is a very common part of web apps. Shared state often evolves from local state, and normally, for the sake of performance and maintainability, local state should be preferred as long as there's no actual need to use this state outside of the component. However, with a bulky shared state setup (provided by some other approaches), a developer might get tempted to store more data in the shared state before it's actually shared to avoid massive future rewrites but potentially impairing the application performance. Groundstate mitigates this temptation by significantly reducing the pain of lifting local state to shared state.

### Responsiveness to store updates

You could notice the `false` parameter of `useStore()` in `PlusButton` in the example above. This is a way to tell the hook not to re-render the component when the store gets updated. Unlike `Display`, `PlusButton` doesn't use the `counter` value, so it doesn't need to track the store updates.

Apart from a boolean value, the second parameter of `useStore()` can also be a function of `(nextState, prevState)` returning a boolean, allowing for subtler fine-tuning of responsiveness to store updates. For more details, see [Filtering store updates](#filtering-store-updates).

### Store provider

You could also notice there's no Context Provider in the example above: the components make use of the default Context value passed to `createContext()`. In more complex apps (especially with SSR), an appropriate Context Provider can be added to specify the initial state:

```diff
- let App = () => <><PlusButton/>{' '}<Display/></>;
+ let App = () => (
+   <AppContext.Provider value={new Store(42)}>
+       <PlusButton/>{' '}<Display/>
+   </AppContext.Provider>
+ );
```

### Store data

In the example above, an instance of the `Store` class wraps a primitive value, but there can be data of any type.

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

Note that a store is picked from the Context just like any other value on a Context. The Context may as well contain other non-store items alongside stores if need be. A store (whether from the Context or elsewhere) is passed to the `useStore()` hook to unpack the current store state and subscribe the component to the store updates.

## Filtering store updates

As previously mentioned, although not a requirement, one way to reduce component updates in response to shared state updates is to split the shared data into a number of more scoped stores.

Let's assume again we've got a component that uses a store from the following store setup (the number of stores doesn't really matter here, it can be one store or multiple stores):

```jsx
let AppContext = createContext({
    users: new Store(/* ... */),
    articles: new Store(/* ... */),
});
```

As either store from this setup grows larger, we may want to filter incoming store updates in the component in a more granular fashion, beyond splitting into the two stores. Below, we'll add the second parameter to the `useStore()` hook to tell it when to respond to the `users` store updates:

```diff
let UserCard = ({userId}) => {
    let [users, setUsers] = useStore(
        useContext(AppContext).users,
+       useCallback((nextUsers, prevUsers) => {
+          return nextUsers[userId].lastModified > prevUsers[userId].lastModified;
+       }, [userId]),
    );

    // rendering
};
```

Now, the `UserCard` component will only respond to the `users` store changes if the `lastModified` timestamp in the `userId` entry has changed. Depending on the data, we could as well provide another filter function like comparing a `revision` field value or carrying out a deep comparison of the next and previous user values.

For the sake of readability, we may want to move such a filter function to a separate file, especially if it recurs across multiple parts of the application:

```js
import {useCallback} from 'react';

export function useChangeByLastModified(id) {
    return useCallback((next, prev) => {
        return next[id].lastModified > prev[id].lastModified;
    }, [id]);
}
```

```diff
+ import {useChangeByLastModified} from './useChangeByLastModified';

let UserCard = ({userId}) => {
    let [users, setUsers] = useStore(
        useContext(AppContext).users,
+       useChangeByLastModified(userId),
    );

    // rendering
};
```

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
-   let [items, setItems] = useState();
+   let [items, setItems] = useStore(itemStore);

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
