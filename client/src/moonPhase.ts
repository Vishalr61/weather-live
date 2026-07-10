// Deliberately its own tiny file with zero imports, not colocated with
// three/geoMath.ts (which has a similar "coarse astronomical approximation"
// getSubsolarPoint) — geoMath.ts imports THREE.Vector3, and pulling that
// into an eagerly-rendered component would drag three.js back into the
// main bundle after the Globe lazy-load split.

const SYNODIC_MONTH_DAYS = 29.53058867;
// A known new moon (Jan 6, 2000, 18:14 UTC) used as the reference epoch.
const KNOWN_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14);

export interface MoonPhase {
  fraction: number; // 0 (new) to 1 (next new), via 0.5 (full)
  name: string;
  emoji: string;
}

export function getMoonPhase(date: Date): MoonPhase {
  const daysSinceKnown = (date.getTime() - KNOWN_NEW_MOON_MS) / 86_400_000;
  const fraction = (((daysSinceKnown % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS) / SYNODIC_MONTH_DAYS;

  if (fraction < 0.03 || fraction >= 0.97) return { fraction, name: 'New Moon', emoji: '🌑' };
  if (fraction < 0.22) return { fraction, name: 'Waxing Crescent', emoji: '🌒' };
  if (fraction < 0.28) return { fraction, name: 'First Quarter', emoji: '🌓' };
  if (fraction < 0.47) return { fraction, name: 'Waxing Gibbous', emoji: '🌔' };
  if (fraction < 0.53) return { fraction, name: 'Full Moon', emoji: '🌕' };
  if (fraction < 0.72) return { fraction, name: 'Waning Gibbous', emoji: '🌖' };
  if (fraction < 0.78) return { fraction, name: 'Last Quarter', emoji: '🌗' };
  return { fraction, name: 'Waning Crescent', emoji: '🌘' };
}
