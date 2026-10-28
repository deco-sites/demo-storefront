import { useSyncExternalStore } from "react";

/**
 * Favourites kept in the browser (localStorage), shared by every heart on the page and the
 * header counter. No account needed; the list survives a reload.
 */
const KEY = "capy:favorites";
const EMPTY: string[] = [];
const listeners = new Set<() => void>();
let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(raw) ? raw.filter((h) => typeof h === "string") : [];
  } catch {
    cache = [];
  }
  return cache;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cache = null;
    fn();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

export function toggleFavorite(handle: string) {
  const list = read();
  cache = list.includes(handle) ? list.filter((h) => h !== handle) : [...list, handle];
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // storage full or blocked: keep the in-memory list for this visit
  }
  listeners.forEach((fn) => fn());
}

export function useFavorites(): string[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
