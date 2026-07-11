const BASE = process.env.NEXT_PUBLIC_API_URL!;

async function getToken(): Promise<string | null> {
  const clerk = (window as any).Clerk;

  const token = clerk?.session
    ? await clerk.session.getToken()
    : null;

  return token;
}
export async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res;
}

export async function apiJson<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, opts);
  return res.json() as Promise<T>;
}

// Streams an SSE endpoint, calling onToken for each text token.
export async function apiStream(
  path: string,
  body: unknown,
  onToken: (t: string) => void,
): Promise<void> {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
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