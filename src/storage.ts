import { AppState } from "./types";

const STORAGE_KEY = "panel-direccion-personal";

export function loadState(): AppState {
  if (typeof window === "undefined") {
    // SSR / seguridad
    return emptyState();
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return emptyState();
  }

  try {
    return JSON.parse(raw) as AppState;
  } catch (e) {
    console.error("Error parsing stored state, resetting.", e);
    return emptyState();
  }
}

export function saveState(state: AppState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function emptyState(): AppState {
  return {
    projects: [],
    tasks: [],
    ideas: [],
    dailyLogs: [],
    reviews: [],
  };
}

export function createId(): string {
  return (
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}
