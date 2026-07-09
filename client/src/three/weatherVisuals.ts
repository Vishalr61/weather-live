// Coarse, purely cosmetic bucketing of WMO codes for marker tinting and
// particle mode — safe to duplicate client-side, unlike the actual alert
// thresholds, which stay server-only (severity arrives pre-computed).
//
// Returns a plain hex string rather than a THREE.Color instance
// deliberately: this module is imported by several components that render
// eagerly on the Home page (Watchlist, ForecastStrip), and a THREE.Color
// dependency here would drag the three.js package into the main bundle
// even though only the lazy-loaded Globe actually needs a real Color
// object — which it constructs locally from this string.
export function weatherCodeToColor(code: number): string {
  if (code >= 95) return '#c084fc'; // thunderstorm — violet
  if (code >= 71 && code <= 77) return '#e0f2fe'; // snow — pale blue-white
  if (code === 85 || code === 86) return '#e0f2fe'; // snow showers
  if (code >= 51 && code <= 67) return '#38bdf8'; // drizzle/rain — blue
  if (code >= 80 && code <= 82) return '#0ea5e9'; // showers — deeper blue
  if (code === 45 || code === 48) return '#9ca3af'; // fog — grey
  if (code >= 1 && code <= 3) return '#facc15'; // partly cloudy — gold
  return '#fde68a'; // clear sky — pale gold
}

export type PrecipMode = 'rain' | 'snow' | 'none';

export function weatherCodeToPrecipMode(code: number): PrecipMode {
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return 'rain';
  return 'none';
}
