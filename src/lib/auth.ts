export interface KfUser {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
  telegram_username: string;
  role: "user" | "admin";
  is_banned: boolean;
  is_muted: boolean;
  ban_reason: string | null;
  mute_until: string | null;
  created_at: string;
}

export function saveToken(token: string) {
  localStorage.setItem("kf_token", token);
}

export function getToken(): string | null {
  return localStorage.getItem("kf_token");
}

export function clearToken() {
  localStorage.removeItem("kf_token");
}

export function isAdmin(user: KfUser | null): boolean {
  return user?.role === "admin";
}
