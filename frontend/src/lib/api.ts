const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("strydex_token");
}

export function setToken(token: string) {
  localStorage.setItem("strydex_token", token);
}

export function clearToken() {
  localStorage.removeItem("strydex_token");
}

async function request(
  path: string,
  options: RequestInit & { auth?: boolean } = {}
) {
  const { auth = true, headers, ...rest } = options;
  const finalHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
  };

  if (auth) {
    const token = getToken();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: finalHeaders,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // ignore
    }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  signup: (email: string, password: string, role: string) =>
    request("/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role }),
      auth: false,
    }),

  login: (email: string, password: string) =>
    request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      auth: false,
    }),

  me: () => request("/auth/me"),

  upsertProfile: (data: Record<string, unknown>) =>
    request("/athletes/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  myProfile: () => request("/athletes/me"),

  verifyAthlete: (athleteId: number, coachName: string) =>
    request(`/athletes/${athleteId}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coach_name: coachName }),
    }),

  addPerformanceLog: (data: Record<string, unknown>) =>
    request("/performance/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  myPerformanceLogs: () => request("/performance/me"),

  uploadVideo: (form: FormData) =>
    request("/videos/upload", { method: "POST", body: form }),

  myVideos: () => request("/videos/me"),

  portfolio: (username: string) =>
    request(`/portfolio/${username}`, { auth: false }),

  scoutSearch: (params: Record<string, string | boolean | undefined>) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    });
    return request(`/scout/search?${qs.toString()}`, { auth: false });
  },
};
