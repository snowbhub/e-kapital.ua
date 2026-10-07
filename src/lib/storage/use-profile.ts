"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { initialState, rollover, type State } from "./schema";
import { loadState, saveState, deleteState } from "./db";
export function useProfile(scope = "profile") {
  const [state, setState] = useState<State>(initialState);
  const [ready, setReady] = useState(false);
  const [loadedScope, setLoadedScope] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const chain = useRef(Promise.resolve());
  const revision = useRef(0);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = useRef(state);
  useEffect(() => {
    let active = true;
    setReady(false);
    revision.current++;
    if (pending.current) clearTimeout(pending.current);
    chain.current
      .then(() => loadState(scope))
      .then((value) => {
        if (active) {
          const loaded = rollover(value || initialState());
          current.current = loaded;
          setState(loaded);
          setReady(true);
          setLoadedScope(scope);
        }
      })
      .catch(() => {
        if (active)
          setError(
            "Не вдалося прочитати дані. Перезавантажте сторінку; дані не перезаписано.",
          );
      });
    return () => {
      active = false;
    };
  }, [scope]);
  useEffect(() => {
    if (!ready || loadedScope !== scope) return;
    const version = ++revision.current;
    setSaved(false);
    const timer = setTimeout(() => {
      chain.current = chain.current
        .then(() => saveState(state, scope))
        .then(() => {
          if (revision.current === version) {
            setSaved(true);
            setError("");
          }
        })
        .catch(() =>
          setError(
            "Не вдалося зберегти. Перевірте вільне місце та дозвіл браузера на зберігання.",
          ),
        );
    }, 250);
    pending.current = timer;
    return () => clearTimeout(timer);
  }, [state, ready, scope, loadedScope]);
  const update = useCallback((fn: (s: State) => State) => {
    revision.current++;
    setSaved(false);
    const next = fn(current.current);
    current.current = next;
    setState(next);
  }, []);
  // Explicit save actions must confirm an IndexedDB commit, not a debounced draft.
  const persist = useCallback(
    async (fn: (s: State) => State) => {
      if (pending.current) clearTimeout(pending.current);
      update(fn);
      const snapshot = current.current;
      const write = chain.current.then(() => saveState(snapshot, scope));
      chain.current = write.catch(() => {});
      try {
        await write;
        return true;
      } catch {
        setError(
          "Не вдалося зберегти план. Перевірте дозвіл браузера на зберігання та спробуйте знову.",
        );
        return false;
      }
    },
    [update, scope],
  );
  const erase = useCallback(async () => {
    revision.current++;
    if (pending.current) clearTimeout(pending.current);
    await chain.current;
    await deleteState(scope);
    const blank = initialState();
    await saveState(blank, scope);
    current.current = blank;
    setState(blank);
    setError("");
    setSaved(true);
  }, [scope]);
  return {
    state,
    update,
    persist,
    ready: ready && loadedScope === scope,
    error,
    saved,
    erase,
    scope,
  };
}
