const base = import.meta.env.VITE_API_BASE_URL ?? "";

let accessToken = sessionStorage.getItem("placecell_access") ?? "";

export function setAccessToken(token: string) {
  accessToken = token;
  if (token) sessionStorage.setItem("placecell_access", token);
  else sessionStorage.removeItem("placecell_access");
}

export function getAccessToken() {
  return accessToken;
}

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${base}${path}`, { ...options, headers, credentials: "include" });
  if (res.status === 401 && !path.includes("/v1/auth/refresh") && !path.includes("/v1/auth/login")) {
    const refreshed = await fetch(`${base}/v1/auth/refresh`, { method: "POST", credentials: "include" });
    if (refreshed.ok) {
      const data = (await refreshed.json()) as { accessToken: string };
      setAccessToken(data.accessToken);
      headers.set("Authorization", `Bearer ${data.accessToken}`);
      const retry = await fetch(`${base}${path}`, { ...options, headers, credentials: "include" });
      if (!retry.ok) throw new Error(await readError(retry));
      if (retry.status === 204) return undefined as T;
      return retry.json() as Promise<T>;
    }
  }
  if (!res.ok) throw new Error(await readError(res));
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function readError(res: Response) {
  try {
    const body = await res.json();
    return body.message ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export const inr = (n?: number) =>
  typeof n === "number" ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n) : "—";
