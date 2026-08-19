// admin-frontend/lib/api-client.ts

const BASE = process.env.NEXT_PUBLIC_API_URL!;

// Auth paths that must never trigger silent-refresh retry
const AUTH_PATHS = ["/api/v1/auth/login", "/api/v1/auth/logout", "/api/v1/auth/refresh", "/api/v1/admin/verify"];

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function apiFetch(
  path: string,
  opts: RequestInit = {},
  _retried = false,
): Promise<Response> {
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string>),
  };

  // Only set JSON content-type for non-FormData bodies
  if (!(typeof FormData !== "undefined" && opts.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers,
    credentials: "include",
  });

  // Access token expired — try a silent refresh once, then retry
  if (res.status === 401 && !_retried && !AUTH_PATHS.includes(path)) {
    if (await tryRefresh()) {
      return apiFetch(path, opts, true);
    }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text}`);
  }

  return res;
}

export async function apiJson<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, opts);
  return res.json() as Promise<T>;
}
