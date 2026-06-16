/**
 * Presentation helpers for tour/route pages. Pure functions — no i18n lookups
 * (enum labels are translated via the "Tours" message namespace in components).
 */

/** Distance in meters → "9.4 km" / "850 m" (locale-formatted number). */
export function formatDistance(meters: number | null, locale: string): string {
  if (meters == null || !isFinite(meters)) return "";
  const intl = locale === "en" ? "en-US" : locale;
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return `${km.toLocaleString(intl, { maximumFractionDigits: 1 })} km`;
}

/** Duration in seconds → "1h 35min" / "26 min". */
export function formatDuration(seconds: number | null): string {
  if (seconds == null || !isFinite(seconds)) return "";
  const totalMin = Math.round(seconds / 60);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

/** A LineString's [lng,lat][] → Leaflet [lat,lng][]. */
export function toLatLngs(coords: number[][]): [number, number][] {
  return coords.map(([lng, lat]) => [lat, lng]);
}
