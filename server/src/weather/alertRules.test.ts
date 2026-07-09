import { describe, expect, it } from 'vitest';
import { evaluateAlert, THRESHOLDS } from './alertRules.js';

const CALM: Omit<Parameters<typeof evaluateAlert>[0], 'cityId'> = {
  temp: 20,
  weatherCode: 1, // mainly clear
  windSpeedKmh: 10,
  precipitationMm: 0,
};

function conditions(overrides: Partial<typeof CALM> = {}) {
  return { cityId: 'test', ...CALM, ...overrides };
}

describe('evaluateAlert', () => {
  it('reports none for calm conditions', () => {
    const result = evaluateAlert(conditions());
    expect(result.severity).toBe('none');
    expect(result.reasons).toEqual([]);
  });

  it('flags thunderstorm codes as severe', () => {
    expect(evaluateAlert(conditions({ weatherCode: 95 })).severity).toBe('severe');
    expect(evaluateAlert(conditions({ weatherCode: 96 })).severity).toBe('severe');
    expect(evaluateAlert(conditions({ weatherCode: 99 })).severity).toBe('severe');
  });

  it('flags heavy-precip codes as watch only, not severe', () => {
    const result = evaluateAlert(conditions({ weatherCode: 65 }));
    expect(result.severity).toBe('watch');
  });

  it('is a no-op just below the wind watch threshold', () => {
    const result = evaluateAlert(
      conditions({ windSpeedKmh: THRESHOLDS.windWatchKmh - 1 })
    );
    expect(result.severity).toBe('none');
  });

  it('triggers watch exactly at the wind watch threshold', () => {
    const result = evaluateAlert(conditions({ windSpeedKmh: THRESHOLDS.windWatchKmh }));
    expect(result.severity).toBe('watch');
  });

  it('triggers severe exactly at the wind severe threshold', () => {
    const result = evaluateAlert(conditions({ windSpeedKmh: THRESHOLDS.windSevereKmh }));
    expect(result.severity).toBe('severe');
  });

  it('triggers severe at extreme heat and extreme cold', () => {
    expect(evaluateAlert(conditions({ temp: THRESHOLDS.tempHotSevereC })).severity).toBe('severe');
    expect(evaluateAlert(conditions({ temp: THRESHOLDS.tempColdSevereC })).severity).toBe('severe');
  });

  it('triggers watch at heat/cold advisory levels below the severe threshold', () => {
    expect(evaluateAlert(conditions({ temp: THRESHOLDS.tempHotWatchC })).severity).toBe('watch');
    expect(evaluateAlert(conditions({ temp: THRESHOLDS.tempColdWatchC })).severity).toBe('watch');
  });

  it('triggers severe on heavy precipitation alone', () => {
    const result = evaluateAlert(conditions({ precipitationMm: THRESHOLDS.precipSevereMm }));
    expect(result.severity).toBe('severe');
  });

  it('combines multiple simultaneous reasons and takes the highest severity', () => {
    const result = evaluateAlert(
      conditions({ windSpeedKmh: THRESHOLDS.windWatchKmh, weatherCode: 95 })
    );
    expect(result.severity).toBe('severe');
    expect(result.reasons.length).toBe(2);
  });
});
