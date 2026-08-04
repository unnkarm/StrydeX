const KEY = "strydex_shortlist";

export function getShortlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function isShortlisted(username: string): boolean {
  return getShortlist().includes(username);
}

export function toggleShortlist(username: string): string[] {
  const current = getShortlist();
  const next = current.includes(username)
    ? current.filter((u) => u !== username)
    : [...current, username];
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
