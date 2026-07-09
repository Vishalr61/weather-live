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
