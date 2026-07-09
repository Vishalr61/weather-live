import { z } from 'zod';
import type { City } from '../data/cities.js';
import type { CityConditions } from './alertRules.js';
import { BatchedCurrentConditionsSchema, DailyBlockSchema } from './openMeteoSchemas.js';

// Open-Meteo accepts comma-separated latitude/longitude lists and returns
// results in the same order as the input — one HTTP call covers all cities
// instead of one call per city.
export async function fetchBatchedConditions(cities: City[]): Promise<CityConditions[]> {
  const lat = cities.map((c) => c.lat).join(',');
  const lng = cities.map((c) => c.lng).join(',');
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,weather_code,wind_speed_10m,precipitation` +
    `&temperature_unit=celsius&wind_speed_unit=kmh`;

  const upstream = await fetch(url);
  if (!upstream.ok) {
    throw new Error(`Open-Meteo request failed: ${upstream.status}`);
  }

  const raw: unknown = await upstream.json();
  const rawResults = Array.isArray(raw) ? raw : [raw];

  if (rawResults.length !== cities.length) {
    throw new Error(
      `Open-Meteo returned ${rawResults.length} results for ${cities.length} cities — cannot zip by index`
    );
  }

  const results = z.array(BatchedCurrentConditionsSchema).parse(rawResults);

  return results.map((result, i) => ({
    cityId: cities[i].id,
    temp: result.current.temperature_2m,
    weatherCode: result.current.weather_code,
    windSpeedKmh: result.current.wind_speed_10m,
    precipitationMm: result.current.precipitation,
  }));
}

export interface DailyEntry {
  date: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
}

// Shared by the forecast (future) and history (past) routes — both are the
// same Open-Meteo "daily" block, just with different past_days/forecast_days
// windows. Returns null on an upstream failure OR an unexpected response
// shape, rather than throwing, so callers can respond 502 the same way
// every other route here does either way.
export async function fetchDailyBlock(
  city: City,
  { pastDays, forecastDays }: { pastDays: number; forecastDays: number }
): Promise<DailyEntry[] | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${city.lat}&longitude=${city.lng}` +
    `&daily=temperature_2m_max,temperature_2m_min,weather_code` +
    `&past_days=${pastDays}&forecast_days=${forecastDays}` +
    `&temperature_unit=celsius&timezone=auto`;

  const upstream = await fetch(url);
  if (!upstream.ok) return null;

  const raw: unknown = await upstream.json();
  const result = DailyBlockSchema.safeParse(raw);
  if (!result.success) return null;

  const { daily } = result.data;
  return daily.time.map((date, i) => ({
    date,
    tempMax: daily.temperature_2m_max[i],
    tempMin: daily.temperature_2m_min[i],
    weatherCode: daily.weather_code[i],
  }));
}
