import type { AlertSeverity } from '../types.js';

// Module-level state tracking each city's last-seen severity, so the poller
// can fire a broadcast only on the transition into 'severe' rather than on
// every poll cycle while conditions stay severe.
const lastSeverity = new Map<string, AlertSeverity>();

export function recordAndCheckEdge(cityId: string, severity: AlertSeverity): boolean {
  const previous = lastSeverity.get(cityId) ?? 'none';
  lastSeverity.set(cityId, severity);
  return severity === 'severe' && previous !== 'severe';
}

export function resetAlertState(): void {
  lastSeverity.clear();
}
