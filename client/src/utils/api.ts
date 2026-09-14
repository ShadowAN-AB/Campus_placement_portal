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

export class ApiError extends Error {
  status: number;
  unavailable: boolean;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.unavailable = status === 0 || status === 502 || status === 503 || status === 504;
  }
}

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, { ...options, headers, credentials: "include" });
  } catch {
    throw new ApiError("Service unreachable", 0);
  }
  if (res.status === 401 && !path.includes("/v1/auth/refresh") && !path.includes("/v1/auth/login")) {
    const refreshed = await fetch(`${base}/v1/auth/refresh`, { method: "POST", credentials: "include" }).catch(() => null);
    if (refreshed?.ok) {
      const data = (await refreshed.json()) as { accessToken: string };
      setAccessToken(data.accessToken);
      headers.set("Authorization", `Bearer ${data.accessToken}`);
      const retry = await fetch(`${base}${path}`, { ...options, headers, credentials: "include" }).catch(() => null);
      if (!retry) throw new ApiError("Service unreachable", 0);
      if (!retry.ok) throw new ApiError(await readError(retry), retry.status);
      if (retry.status === 204) return undefined as T;
      return retry.json() as Promise<T>;
    }
  }
  if (!res.ok) throw new ApiError(await readError(res), res.status);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function apiTry<T>(path: string, fallback: T, options?: RequestInit): Promise<{ data: T; down: boolean }> {
  try {
    return { data: await api<T>(path, options), down: false };
  } catch (e) {
    return { data: fallback, down: e instanceof ApiError ? e.unavailable : true };
  }
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
