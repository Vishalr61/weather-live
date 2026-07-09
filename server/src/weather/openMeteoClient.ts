import type { City } from '../data/cities.js';
import type { CityConditions } from './alertRules.js';

interface OpenMeteoCurrentBlock {
  temperature_2m: number;
  weather_code: number;
  wind_speed_10m: number;
  precipitation: number;
}

interface OpenMeteoLocationResult {
  current: OpenMeteoCurrentBlock;
}

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

  const data = (await upstream.json()) as OpenMeteoLocationResult | OpenMeteoLocationResult[];
  const results = Array.isArray(data) ? data : [data];

  if (results.length !== cities.length) {
    throw new Error(
      `Open-Meteo returned ${results.length} results for ${cities.length} cities — cannot zip by index`
    );
  }

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

interface OpenMeteoDailyBlock {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  weather_code: number[];
}

// Shared by the forecast (future) and history (past) routes — both are the
// same Open-Meteo "daily" block, just with different past_days/forecast_days
// windows. Returns null on an upstream failure rather than throwing, so
// callers can respond 502 the same way every other route here does.
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

  const data = (await upstream.json()) as { daily: OpenMeteoDailyBlock };
  return data.daily.time.map((date, i) => ({
    date,
    tempMax: data.daily.temperature_2m_max[i],
    tempMin: data.daily.temperature_2m_min[i],
    weatherCode: data.daily.weather_code[i],
  }));
}
