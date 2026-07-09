import type { City, WeatherResponse, WeatherSnapshotPayload } from '../types.ts';

export async function fetchCities(): Promise<City[]> {
  const res = await fetch('/api/weather/cities');
  if (!res.ok) throw new Error('Failed to load cities');
  return res.json() as Promise<City[]>;
}

export async function fetchWeatherBatch(): Promise<WeatherSnapshotPayload> {
  const res = await fetch('/api/weather/batch');
  if (!res.ok) throw new Error('Failed to load weather snapshot');
  return res.json() as Promise<WeatherSnapshotPayload>;
}

export async function fetchWeather(cityId: string): Promise<WeatherResponse> {
  const res = await fetch(`/api/weather?city=${encodeURIComponent(cityId)}`);
  if (!res.ok) throw new Error('Failed to load weather');
  return res.json() as Promise<WeatherResponse>;
}
