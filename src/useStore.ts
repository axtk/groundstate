import {useEffect, useMemo, useState} from 'react';
import {Store} from './Store';

export type SetStoreState<T> = Store<T>['setState'];
export type IsResponsive<T> = (nextState: T, prevState: T) => boolean;

export function useStore<T>(
    store: Store<T>,
    isResponsive: boolean | IsResponsive<T> = true,
): [T, SetStoreState<T>] {
    if (!(store instanceof Store))
        throw new Error('\'store\' is not an instance of Store');

    let [, setRevision] = useState(-1);

    let state = store.getState();
    let setState = useMemo(() => store.setState.bind(store), [store]);

    useEffect(() => {
        if (!isResponsive)
            return;

        return store.subscribe((nextState, prevState) => {
            if (typeof isResponsive !== 'function' || isResponsive(nextState, prevState))
                setRevision(Math.random());
        });
    }, [store, isResponsive]);

    return [state, setState];
}
