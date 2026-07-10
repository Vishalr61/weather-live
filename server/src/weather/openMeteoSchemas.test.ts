import { describe, expect, it } from 'vitest';
import {
  BatchedCurrentConditionsSchema,
  CurrentConditionsSchema,
  DailyBlockSchema,
} from './openMeteoSchemas.js';

const WELL_FORMED_CURRENT = {
  current: {
    temperature_2m: 21.5,
    weather_code: 3,
    wind_speed_10m: 10,
    wind_direction_10m: 180,
    relative_humidity_2m: 55,
    apparent_temperature: 20,
  },
  daily: {
    sunrise: ['2026-07-10T07:34'],
    sunset: ['2026-07-10T17:16'],
    uv_index_max: [3.0],
  },
};

describe('CurrentConditionsSchema', () => {
  it('accepts a well-formed current-conditions + today response', () => {
    const result = CurrentConditionsSchema.safeParse(WELL_FORMED_CURRENT);
    expect(result.success).toBe(true);
  });

  it('rejects a response missing the current block', () => {
    const result = CurrentConditionsSchema.safeParse({ latitude: 1, longitude: 2 });
    expect(result.success).toBe(false);
  });

  it('rejects a renamed/missing field (e.g. weather_code -> weathercode)', () => {
    const { current: _current, ...rest } = WELL_FORMED_CURRENT;
    const result = CurrentConditionsSchema.safeParse({
      ...rest,
      current: { ...WELL_FORMED_CURRENT.current, weather_code: undefined, weathercode: 3 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a wrong-typed field', () => {
    const result = CurrentConditionsSchema.safeParse({
      ...WELL_FORMED_CURRENT,
      current: { ...WELL_FORMED_CURRENT.current, temperature_2m: '21.5' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a daily block missing sunrise/sunset/uv_index_max', () => {
    const result = CurrentConditionsSchema.safeParse({
      current: WELL_FORMED_CURRENT.current,
      daily: {},
    });
    expect(result.success).toBe(false);
  });
});

describe('BatchedCurrentConditionsSchema', () => {
  it('accepts a well-formed single-location entry', () => {
    const result = BatchedCurrentConditionsSchema.safeParse({
      current: { temperature_2m: 21.5, weather_code: 3, wind_speed_10m: 12, precipitation: 0 },
    });
    expect(result.success).toBe(true);
  });

  it('rejects an entry missing wind/precipitation fields', () => {
    const result = BatchedCurrentConditionsSchema.safeParse({
      current: { temperature_2m: 21.5, weather_code: 3 },
    });
    expect(result.success).toBe(false);
  });
});

describe('DailyBlockSchema', () => {
  it('accepts a well-formed daily block', () => {
    const result = DailyBlockSchema.safeParse({
      daily: {
        time: ['2026-07-09', '2026-07-10'],
        temperature_2m_max: [20, 21],
        temperature_2m_min: [10, 11],
        weather_code: [0, 1],
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects mismatched array lengths across the daily block', () => {
    const result = DailyBlockSchema.safeParse({
      daily: {
        time: ['2026-07-09', '2026-07-10'],
        temperature_2m_max: [20],
        temperature_2m_min: [10, 11],
        weather_code: [0, 1],
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-array field', () => {
    const result = DailyBlockSchema.safeParse({
      daily: {
        time: ['2026-07-09'],
        temperature_2m_max: 20,
        temperature_2m_min: [10],
        weather_code: [0],
      },
    });
    expect(result.success).toBe(false);
  });
});
