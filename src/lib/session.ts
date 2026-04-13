"use client";

const SESSION_KEY = "memeify-session";

export interface MemeifySession {
  roomCode: string;
  nickname: string;
  userId: string;
}

export function getSession(): MemeifySession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as MemeifySession;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function saveSession(session: MemeifySession) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
