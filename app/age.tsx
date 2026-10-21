"use client";

import { useSyncExternalStore } from "react";

// The page is cached and keeps serving its last good copy when rflab is down, so a time
// written into it at render would claim freshness it no longer has. Age is computed in the
// viewer's browser instead, and past `staleAfterMin` it turns into a warning: staleness
// outranks content.

// One shared clock, ticking every 30 s while anything is subscribed.
let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(fn: () => void) {
  listeners.add(fn);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 30_000);
  }
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

export function Age({ iso, staleAfterMin }: { iso: string; staleAfterMin: number }) {
  const t = useSyncExternalStore(subscribe, () => now, () => null);
  if (t === null) return <span className="age">…</span>;
  const min = Math.max(0, Math.round((t - Date.parse(iso)) / 60_000));
  const text = min < 1 ? "just now" : min < 60 ? `${min} min ago` : min < 2880 ? `${Math.round(min / 60)} h ago` : `${Math.round(min / 1440)} days ago`;
  const stale = min > staleAfterMin;
  return (
    <span className={stale ? "age stale" : "age"}>
      {stale ? "⚠ stale · " : ""}
      {text}
    </span>
  );
}
