import type { AlertSeverity } from '../types.js';

export interface CityConditions {
  cityId: string;
  temp: number;
  weatherCode: number;
  windSpeedKmh: number;
  precipitationMm: number;
}

export interface AlertEvaluation {
  severity: AlertSeverity;
  reasons: string[];
}

export const THRESHOLDS = {
  // Beaufort scale: ~8 (gale) and ~6-7 (strong breeze/near gale).
  windSevereKmh: 60,
  windWatchKmh: 40,
  // NWS heavy-rain-rate guidance, applied to Open-Meteo's current-block mm.
  precipSevereMm: 8,
  precipWatchMm: 4,
  // Standard heat-advisory / extreme-heat ranges.
  tempHotSevereC: 40,
  tempHotWatchC: 35,
  // Standard cold-advisory / extreme-cold ranges.
  tempColdSevereC: -15,
  tempColdWatchC: -5,
};

// Thunderstorm variants — always severe regardless of other readings.
const SEVERE_CODES = new Set([95, 96, 99]);
// Heavy rain / heavy snow / violent showers — watch tier on their own.
const WATCH_CODES = new Set([65, 75, 82]);

const RANK: Record<AlertSeverity, number> = { none: 0, watch: 1, severe: 2 };

export function evaluateAlert(c: CityConditions): AlertEvaluation {
  const findings: Array<{ level: AlertSeverity; reason: string }> = [];

  if (SEVERE_CODES.has(c.weatherCode)) {
    findings.push({ level: 'severe', reason: 'thunderstorm conditions' });
  } else if (WATCH_CODES.has(c.weatherCode)) {
    findings.push({ level: 'watch', reason: 'heavy precipitation conditions' });
  }

  if (c.windSpeedKmh >= THRESHOLDS.windSevereKmh) {
    findings.push({ level: 'severe', reason: `wind ${c.windSpeedKmh.toFixed(0)} km/h` });
  } else if (c.windSpeedKmh >= THRESHOLDS.windWatchKmh) {
    findings.push({ level: 'watch', reason: `wind ${c.windSpeedKmh.toFixed(0)} km/h` });
  }

  if (c.precipitationMm >= THRESHOLDS.precipSevereMm) {
    findings.push({ level: 'severe', reason: `precipitation ${c.precipitationMm.toFixed(1)} mm` });
  } else if (c.precipitationMm >= THRESHOLDS.precipWatchMm) {
    findings.push({ level: 'watch', reason: `precipitation ${c.precipitationMm.toFixed(1)} mm` });
  }

  if (c.temp >= THRESHOLDS.tempHotSevereC || c.temp <= THRESHOLDS.tempColdSevereC) {
    findings.push({ level: 'severe', reason: `extreme temperature ${c.temp.toFixed(0)}°C` });
  } else if (c.temp >= THRESHOLDS.tempHotWatchC || c.temp <= THRESHOLDS.tempColdWatchC) {
    findings.push({ level: 'watch', reason: `extreme temperature ${c.temp.toFixed(0)}°C` });
  }

  const severity = findings.reduce<AlertSeverity>(
    (max, f) => (RANK[f.level] > RANK[max] ? f.level : max),
    'none'
  );

  return { severity, reasons: findings.map((f) => f.reason) };
}
