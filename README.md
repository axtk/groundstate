[![npm](https://img.shields.io/npm/v/groundstate?labelColor=royalblue&color=royalblue&style=flat-square)](https://www.npmjs.com/package/groundstate) [![GitHub](https://img.shields.io/badge/-GitHub-royalblue?labelColor=royalblue&color=royalblue&style=flat-square&logo=github)](https://github.com/axtk/groundstate) ![React](https://img.shields.io/badge/%23-React-345?labelColor=345&color=345&style=flat-square) [![SSR](https://img.shields.io/badge/%23-SSR-345?labelColor=345&color=345&style=flat-square)](#server-side-rendering-ssr) ![TypeScript](https://img.shields.io/badge/%23-TypeScript-345?labelColor=345&color=345&style=flat-square)

# groundstate

Minimalist shared state management for React apps

- Easy to set up, similar to `useState()`, no boilerplate code
- Painless transition from local state to shared state and vice versa
- SSR-compatible
- Lightweight

## Installation

```
npm i groundstate
```

## Usage

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

After the edits, whenever the counter is updated by clicking `PlusButton`, `Display` gets notified and re-rendered with the new counter value.

Note how little change is required to replace local state with shared state, which is a typical task in the development of an app (and yet not so quickly achieved with many other approaches to shared state management).

The `Store` class and the `useStore()` hook together do the trick of the shared state management.

### Fine-tuning responsiveness to store updates

You might have noticed the `false` parameter of `useStore()` in `PlusButton`. This is a way to tell the hook not to re-render the component when the store gets updated. Unlike `Display`, `PlusButton` doesn't use the `counter` value, so it doesn't need to track the store updates.

Apart from a boolean value, the second parameter of `useStore()` can also be a function of `(nextState, prevState)` returning a boolean, allowing for subtler fine-tuning of responsiveness to store updates.

### Store provider

You might also notice there's no Context Provider in the example above: the components make use of the default Context value passed to `createContext()`. In more complex apps (especially with SSR), an appropriate Context Provider can be added to specify the initial state:

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

    // ...
};
```

In this example, the `UserCard` component uses only the `users` store from `AppContext`. It won't be re-rendered if the contents of the `articles` store gets updated (just as intended).

Note that a store is picked from the Context just like any other value on a Context. The Context may as well contain other non-store items alongside stores if need be. A store (whether from the Context or elsewhere) is passed to the `useStore()` hook to unpack the current store state and subscribe the component to the store updates.

## Other use cases

### Persistent local state

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

### Connecting a store to external storage

`itemStore` from the example above can be further upgraded to make the component state persistent across page reloads without affecting the component's internals.

```js
let initialState;

try {
    initialState = JSON.parse(localStorage.getItem('list'));
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

### Direct subscription to store updates

For some purposes (like logging or debugging the data flow), it might be helpful to directly subscribe to state updates via the store's `subscribe()` method:

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

### Adding *immer*

*immer* is not part of this package but it can be used with `useStore()` just the same way as [with `useState()`](https://immerjs.github.io/immer/example-setstate#usestate--immer) to facilitate deeply nested data changes.
