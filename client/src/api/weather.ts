import type { City, WeatherResponse } from '../types.ts';

export async function fetchCities(): Promise<City[]> {
  const res = await fetch('/api/weather/cities');
  if (!res.ok) throw new Error('Failed to load cities');
  return res.json() as Promise<City[]>;
}

export async function fetchWeather(cityId: string): Promise<WeatherResponse> {
  const res = await fetch(`/api/weather?city=${encodeURIComponent(cityId)}`);
  if (!res.ok) throw new Error('Failed to load weather');
  return res.json() as Promise<WeatherResponse>;
}
