// Cal and Dean are in Kansas; every time on the page is Central, labelled as such once.
const TZ = "America/Chicago";

export function central(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function centralDate(isoOrDay: string): string {
  // A bare YYYY-MM-DD is already a Central calendar day; parse it at noon so no zone shifts it.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(isoOrDay) ? new Date(`${isoOrDay}T12:00:00Z`) : new Date(isoOrDay);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: /^\d{4}-\d{2}-\d{2}$/.test(isoOrDay) ? "UTC" : TZ,
    month: "short",
    day: "numeric",
  }).format(d);
}

export function duration(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  return d > 0 ? `${d}d ${h}h` : `${h}h ${Math.floor((seconds % 3600) / 60)}m`;
}
