"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";
export type ClientAccount = {
  id: string;
  name: string;
  analytics: boolean;
  geography: boolean;
  admin: boolean;
};
export async function accountApi(
  path: string,
  body?: unknown,
  method = "POST",
) {
  const response = await fetch(path, {
    method,
    cache: "no-store",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Сервер недоступний");
  return result;
}
export function useAccountSession() {
  const [user, setUser] = useState<ClientAccount | null>(null),
    [enabled, setEnabled] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++generation.current;
    try {
      const r = await accountApi("/api/account/session", undefined, "GET");
      if (generation.current === version) {
        setUser(r.user);
        setEnabled(r.enabled);
      }
    } catch {
      /* Guest and offline use do not depend on the account server. */
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const authenticate = async (kind: "register" | "login", name = "") => {
    setBusy(true);
    setError("");
    generation.current++;
    try {
      const options = await accountApi(`/api/account/${kind}/options`, {
        name,
      });
      const credential =
        kind === "register"
          ? await startRegistration({ optionsJSON: options })
          : await startAuthentication({ optionsJSON: options });
      const result = await accountApi(`/api/account/${kind}/verify`, {
        credential,
      });
      setUser(result.user);
    } catch (e) {
      setError(
        (e as Error).name === "NotAllowedError"
          ? "Вхід скасовано. Можна спробувати ще раз."
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  };
  const logout = async (all = false) => {
    setBusy(true);
    setError("");
    try {
      await accountApi(`/api/account/${all ? "logout-all" : "logout"}`, {});
      generation.current++;
      setUser(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const preferences = async (analytics: boolean, geography: boolean) => {
    setBusy(true);
    setError("");
    try {
      const r = await accountApi("/api/account/preferences", {
        analytics,
        geography,
      });
      setUser(r.user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    await accountApi("/api/account/delete", { confirm: "DELETE" });
  };
  return {
    user,
    enabled,
    busy,
    error,
    authenticate,
    logout,
    preferences,
    remove,
    refresh,
  };
}
