"use client";

const ADMIN_KEY = "highlife_roadmap_admin";

export interface AdminSession {
  username: string;
  role: "admin";
  loggedInAt: string;
}

export function adminLogin(
  username: string,
  password: string
): AdminSession | null {
  if (username !== "admin" || password !== "admin") return null;
  const session: AdminSession = {
    username: "admin",
    role: "admin",
    loggedInAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    sessionStorage.setItem(ADMIN_KEY, JSON.stringify(session));
  }
  return session;
}

export function adminLogout(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(ADMIN_KEY);
  }
}

export function getAdminSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(ADMIN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
}

export function isAdminAuthed(): boolean {
  return getAdminSession() !== null;
}
