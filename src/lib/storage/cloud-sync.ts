"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { stateSchema, type State } from "./schema";
import { cloudBaseline, loadState, saveCloudBaseline } from "./db";
import type { useProfile } from "./use-profile";
import type { ClientAccount } from "./account-client";
export function changedSections(previous: State, next: State) {
  return Object.fromEntries(
    Object.entries(next).filter(
      ([key, value]) =>
        JSON.stringify(value) !== JSON.stringify(previous[key as keyof State]),
    ),
  );
}
export function useCloudSync(
  profile: ReturnType<typeof useProfile>,
  user: ClientAccount | null,
) {
  const [status, setStatus] = useState("Лише на пристрої"),
    [hydrated, setHydrated] = useState(false),
    [conflict, setConflict] = useState(false);
  const baseline = useRef<{ revision: number; state: State } | null>(null),
    current = useRef(profile.state),
    inflight = useRef(false),
    generation = useRef(0);
  useEffect(() => {
    current.current = profile.state;
  }, [profile.state]);
  const { ready, persist } = profile;
  const userId = user?.id,
    scope = profile.scope;
  const pull = useCallback(
    async (discard = false) => {
      if (!userId || !ready) return;
      const epoch = generation.current;
      const draftAtStart = JSON.stringify(current.current);
      setStatus("Підключаємо профіль…");
      try {
        const cached = baseline.current ?? (await cloudBaseline(scope));
        const response = await fetch("/api/profile", {
          cache: "no-store",
          headers:
            !discard && cached
              ? { "If-None-Match": `"${cached.revision}"` }
              : {},
        });
        if (epoch !== generation.current) return;
        if (response.status === 304 && cached) {
          baseline.current = cached;
          setHydrated(true);
          setConflict(false);
          setStatus("Синхронізовано");
          return;
        }
        if (!response.ok)
          throw Error("Немає зв’язку. Зміни залишаються на пристрої.");
        const value = await response.json();
        if (epoch !== generation.current) return;
        const remote = value.state ? stateSchema.parse(value.state) : null;
        const dirty =
          cached &&
          Object.keys(changedSections(cached.state, current.current)).length >
            0;
        if (
          remote &&
          !discard &&
          ((dirty && value.revision !== cached!.revision) ||
            (!cached && draftAtStart !== JSON.stringify(current.current))) &&
          JSON.stringify(remote) !== JSON.stringify(current.current)
        ) {
          setConflict(true);
          setStatus("Зміни на двох пристроях");
          setHydrated(false);
          return;
        }
        if (remote) {
          baseline.current = { revision: value.revision, state: remote };
          await saveCloudBaseline(scope, value.revision, remote);
          if (discard || !dirty || value.revision !== cached?.revision)
            await persist(() => remote);
        } else {
          baseline.current = {
            revision: 0,
            state: stateSchema.parse({ ...current.current }),
          };
        }
        setConflict(false);
        setHydrated(true);
        setStatus(
          remote
            ? "Синхронізовано"
            : "Профіль порожній — перенесіть дані або почніть новий план",
        );
      } catch (e) {
        if (epoch === generation.current) {
          setStatus((e as Error).message);
          setHydrated(false);
        }
      }
    },
    [userId, scope, ready, persist],
  );
  useEffect(() => {
    const epoch = ++generation.current;
    baseline.current = null;
    setHydrated(false);
    setConflict(false);
    if (userId && profile.ready) void pull();
    else setStatus("Лише на пристрої");
    return () => {
      generation.current = epoch + 1;
    };
  }, [userId, profile.ready, pull]);
  const sync = useCallback(async () => {
    if (
      !userId ||
      !hydrated ||
      conflict ||
      inflight.current ||
      !baseline.current ||
      !navigator.onLine
    )
      return;
    const snapshot = current.current,
      previous = baseline.current,
      patch =
        previous.revision === 0
          ? snapshot
          : changedSections(previous.state, snapshot);
    if (!Object.keys(patch).length) return;
    const epoch = generation.current;
    inflight.current = true;
    setStatus("Зберігаємо у профіль…");
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revision: previous.revision, patch }),
      });
      const result = await response.json();
      if (epoch !== generation.current) return;
      if (response.status === 409) {
        setConflict(true);
        setHydrated(false);
        setStatus(result.error);
        return;
      }
      if (!response.ok)
        throw Error(result.error ?? "Не вдалося синхронізувати");
      baseline.current = { revision: result.revision, state: snapshot };
      await saveCloudBaseline(scope, result.revision, snapshot);
      setStatus("Синхронізовано");
    } catch {
      if (epoch === generation.current)
        setStatus(
          "Зміни збережено на пристрої. Повторимо після відновлення зв’язку.",
        );
    } finally {
      inflight.current = false;
    }
  }, [userId, hydrated, conflict, scope]);
  useEffect(() => {
    if (!hydrated || !profile.ready) return;
    const timer = setTimeout(() => void sync(), 1500);
    return () => clearTimeout(timer);
  }, [profile.state, profile.ready, hydrated, sync]);
  useEffect(() => {
    const retry = () => {
      if (hydrated) void sync();
      else void pull();
    };
    let lastFocus = 0;
    const focus = () => {
      if (Date.now() - lastFocus < 300000 || inflight.current || conflict)
        return;
      lastFocus = Date.now();
      void pull();
    };
    window.addEventListener("focus", focus);
    window.addEventListener("online", retry);
    const timer = setInterval(retry, 30000);
    return () => {
      window.removeEventListener("focus", focus);
      window.removeEventListener("online", retry);
      clearInterval(timer);
    };
  }, [hydrated, sync, pull, conflict]);
  const importGuest = async () => {
    if (!userId || !hydrated || conflict) return;
    const guest = await loadState();
    if (guest) await profile.persist(() => guest);
  };
  return { status, conflict, hydrated, reload: () => pull(true), importGuest };
}
