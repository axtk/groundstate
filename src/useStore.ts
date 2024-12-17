import {useEffect, useMemo, useState} from 'react';
import {Store} from './Store';

export type SetStoreState<T> = Store<T>['setState'];
export type ShouldSubscribe<T> = (nextState: T, prevState: T) => boolean;

export function useStore<T>(
    store: Store<T>,
    shouldSubscribe: boolean | ShouldSubscribe<T> = true,
): [T, SetStoreState<T>] {
    if (!(store instanceof Store))
        throw new Error('\'store\' is not an instance of Store');

    let [, setRevision] = useState(-1);

    let state = store.getState();
    let setState = useMemo(() => store.setState.bind(store), [store]);

    useEffect(() => {
        if (!shouldSubscribe)
            return;

        return store.subscribe((nextState, prevState) => {
            if (typeof shouldSubscribe !== 'function' || shouldSubscribe(nextState, prevState))
                setRevision(Math.random());
        });
    }, [store, shouldSubscribe]);

    return [state, setState];
}
