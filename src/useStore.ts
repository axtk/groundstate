import {useEffect, useMemo, useRef, useState} from 'react';
import {isStore} from './isStore';
import type {Store} from './Store';

export type SetStoreState<T> = Store<T>['setState'];
export type ShouldUpdateCallback<T> = (nextState: T, prevState: T) => boolean;
export type ShouldUpdate<T> = boolean | ShouldUpdateCallback<T>;

export function useStore<T>(
    store: Store<T>,
    /**
     * Controls whether the component should be updated in response
     * to the store updates.
     *
     * @defaultValue `true`
     *
     * Can be set to `false` when the component only requires the
     * store state setter but not the state value itself, and so the
     * component doesn't need to respond to updates in the store state.
     *
     * ```ts
     * let [, setValue] = useStore(store, false);
     * ```
     *
     * Can be set to a function `(nextState, prevState) => boolean` to
     * make the component respond only to specific store state changes.
     */
    shouldUpdate: ShouldUpdate<T> = true,
): [T, SetStoreState<T>] {
    if (!isStore(store)) throw new Error("'store' is not an instance of Store");

    let [, setRevision] = useState(-1);
    let initedRef = useRef(false);

    let state = store.getState();
    let setState = useMemo(() => store.setState.bind(store), [store]);

    useEffect(() => {
        if (!shouldUpdate) return;

        if (!initedRef.current) {
            initedRef.current = true;
            setRevision(Math.random());
        }

        return store.subscribe((nextState, prevState) => {
            if (
                typeof shouldUpdate !== 'function' ||
                shouldUpdate(nextState, prevState)
            )
                setRevision(Math.random());
        });
    }, [store, shouldUpdate]);

    return [state, setState];
}
