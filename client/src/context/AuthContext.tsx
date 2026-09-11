import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, getAccessToken, setAccessToken } from "../utils/api";

export type User = { id: string; name: string; email: string; role: "student" | "recruiter" | "admin" };

type AuthState = {
  user: User | null;
  token: string;
  ready: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (payload: Record<string, string>) => Promise<User>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = sessionStorage.getItem("placecell_user");
    return raw ? (JSON.parse(raw) as User) : null;
  });
  const [token, setToken] = useState(getAccessToken());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (!getAccessToken()) {
          const data = await api<{ accessToken: string; user: User }>("/v1/auth/refresh", { method: "POST" });
          setAccessToken(data.accessToken);
          setToken(data.accessToken);
          setUser(data.user);
          sessionStorage.setItem("placecell_user", JSON.stringify(data.user));
        } else {
          const me = await api<User>("/v1/auth/me");
          setUser(me);
          sessionStorage.setItem("placecell_user", JSON.stringify(me));
        }
      } catch {
        setAccessToken("");
        setUser(null);
        sessionStorage.removeItem("placecell_user");
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      token,
      ready,
      async login(email, password) {
        const data = await api<{ accessToken: string; user: User }>("/v1/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        setAccessToken(data.accessToken);
        setToken(data.accessToken);
        setUser(data.user);
        sessionStorage.setItem("placecell_user", JSON.stringify(data.user));
        return data.user;
      },
      async signup(payload) {
        const data = await api<{ accessToken: string; user: User }>("/v1/auth/signup", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setAccessToken(data.accessToken);
        setToken(data.accessToken);
        setUser(data.user);
        sessionStorage.setItem("placecell_user", JSON.stringify(data.user));
        return data.user;
      },
      async logout() {
        await api("/v1/auth/logout", { method: "POST" }).catch(() => undefined);
        setAccessToken("");
        setToken("");
        setUser(null);
        sessionStorage.removeItem("placecell_user");
      },
    }),
    [user, token, ready],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth");
  return ctx;
}
