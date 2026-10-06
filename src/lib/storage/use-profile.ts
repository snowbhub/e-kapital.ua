"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { initialState, rollover, type State } from "./schema";
import { loadState, saveState, deleteState } from "./db";
export function useProfile() {
  const [state, setState] = useState<State>(initialState);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const chain = useRef(Promise.resolve());
  const revision = useRef(0);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    let active = true;
    loadState()
      .then((value) => {
        if (active) {
          setState(rollover(value || initialState()));
          setReady(true);
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
  }, []);
  useEffect(() => {
    if (!ready) return;
    const version = ++revision.current;
    setSaved(false);
    const timer = setTimeout(() => {
      chain.current = chain.current
        .then(() => saveState(state))
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
  }, [state, ready]);
  const update = useCallback((fn: (s: State) => State) => {
    revision.current++;
    setSaved(false);
    setState((s) => fn(s));
  }, []);
  const erase = useCallback(async () => {
    revision.current++;
    if (pending.current) clearTimeout(pending.current);
    await chain.current;
    await deleteState();
    const blank = initialState();
    await saveState(blank);
    setState(blank);
    setError("");
    setSaved(true);
  }, []);
  return { state, update, ready, error, saved, erase };
}
