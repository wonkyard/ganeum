/**
 * 아주 작은 반응형 스토어. 프레임워크 대신 쓴다(스펙 §8).
 * 불변 갱신 + 동기 구독 알림. 상태 트리는 얕게 유지한다.
 */

export type Updater<T> = Partial<T> | ((prev: T) => Partial<T>);
export type Listener<T> = (state: T) => void;

export interface Store<T> {
  get(): T;
  set(update: Updater<T>): void;
  subscribe(listener: Listener<T>, emitNow?: boolean): () => void;
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<Listener<T>>();

  return {
    get: () => state,
    set(update) {
      const patch = typeof update === "function" ? update(state) : update;
      state = { ...state, ...patch };
      for (const listener of listeners) listener(state);
    },
    subscribe(listener, emitNow = true) {
      listeners.add(listener);
      if (emitNow) listener(state);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
