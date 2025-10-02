// lib/event-storage.ts
const isBrowser =
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

type StoredEvent = {
  id: string;
  title: string;
  description?: string | null;
  date?: string | null;       // ISO
  expires_at?: string | null; // ISO (optional)
  [k: string]: any;
};

const KEY = "v0_events";

export class EventStorage {
  constructor() {
    // Don't touch localStorage during SSR
    if (isBrowser) {
      this.cleanupExpiredEvents();
    }
  }

  /** Read all, SSR-safe (returns [] on server) */
  getAllEvents(): StoredEvent[] {
    if (!isBrowser) return [];
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw) as StoredEvent[];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  /** Write all, SSR-safe (no-op on server) */
  private setAllEvents(events: StoredEvent[]) {
    if (!isBrowser) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(events));
    } catch {
      // ignore quota / private mode errors
    }
  }

  addEvent(evt: StoredEvent) {
    if (!isBrowser) return; // no-op on server
    const all = this.getAllEvents();
    const idx = all.findIndex((e) => e.id === evt.id);
    if (idx >= 0) all[idx] = evt;
    else all.unshift(evt);
    this.setAllEvents(all);
  }

  getEvent(id: string): StoredEvent | null {
    const all = this.getAllEvents();
    return all.find((e) => e.id === id) ?? null;
  }

  removeEvent(id: string) {
    if (!isBrowser) return;
    const all = this.getAllEvents().filter((e) => e.id !== id);
    this.setAllEvents(all);
  }

  /** Remove items whose `expires_at` is in the past (client only). */
  cleanupExpiredEvents() {
    if (!isBrowser) return;
    const now = Date.now();
    const kept = this.getAllEvents().filter((e) => {
      if (!e.expires_at) return true;
      const t = Date.parse(e.expires_at);
      return isFinite(t) ? t > now : true;
    });
    this.setAllEvents(kept);
  }
}

// Singleton helper (safe to import on server; methods no-op there)
export const eventStorage = new EventStorage();
