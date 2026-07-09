import { Color } from 'three';

// Coarse, purely cosmetic bucketing of WMO codes for marker tinting and
// particle mode — safe to duplicate client-side, unlike the actual alert
// thresholds, which stay server-only (severity arrives pre-computed).
export function weatherCodeToColor(code: number): Color {
  if (code >= 95) return new Color('#c084fc'); // thunderstorm — violet
  if (code >= 71 && code <= 77) return new Color('#e0f2fe'); // snow — pale blue-white
  if (code === 85 || code === 86) return new Color('#e0f2fe'); // snow showers
  if (code >= 51 && code <= 67) return new Color('#38bdf8'); // drizzle/rain — blue
  if (code >= 80 && code <= 82) return new Color('#0ea5e9'); // showers — deeper blue
  if (code === 45 || code === 48) return new Color('#9ca3af'); // fog — grey
  if (code >= 1 && code <= 3) return new Color('#facc15'); // partly cloudy — gold
  return new Color('#fde68a'); // clear sky — pale gold
}

export type PrecipMode = 'rain' | 'snow' | 'none';

export function weatherCodeToPrecipMode(code: number): PrecipMode {
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return 'rain';
  return 'none';
}
