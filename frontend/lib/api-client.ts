const BASE = process.env.NEXT_PUBLIC_API_URL!;

// Endpoints that must never trigger the silent-refresh retry (they are the
// refresh/identity endpoints themselves).
const AUTH_PATHS = ["/api/v1/auth/login", "/api/v1/auth/logout", "/api/v1/auth/refresh"];

function shouldAttachJsonContentType(body: unknown): boolean {
  return !(typeof FormData !== "undefined" && body instanceof FormData);
}

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
  if (shouldAttachJsonContentType(opts.body)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers,
    credentials: "include",
  });

  // Access token expired — try a silent refresh once, then retry the request.
  if (res.status === 401 && !_retried && !AUTH_PATHS.includes(path)) {
    if (await tryRefresh()) {
      return apiFetch(path, opts, true);
    }
  }

  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res;
}

export async function apiJson<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, opts);
  return res.json() as Promise<T>;
}

/** Multipart upload (logo, knowledge files, CSV imports) — cookie-authed. */
export async function apiUpload(path: string, form: FormData): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res;
}

// Streams an SSE endpoint, calling onToken for each text token.
export async function apiStream(
  path: string,
  body: unknown,
  onToken: (t: string) => void,
): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const chunk of parts) {
      const line = chunk.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const { text } = JSON.parse(payload);
        if (text) onToken(text);
      } catch {
        /* ignore keep-alive / non-json */
      }
    }
  }
}