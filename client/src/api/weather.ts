import type {
  City,
  ForecastResponse,
  GlobalAlertPayload,
  WeatherResponse,
  WeatherSnapshotPayload,
} from '../types.ts';

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

export async function fetchForecast(cityId: string): Promise<ForecastResponse> {
  const res = await fetch(`/api/weather/forecast?city=${encodeURIComponent(cityId)}`);
  if (!res.ok) throw new Error('Failed to load forecast');
  return res.json() as Promise<ForecastResponse>;
}

export async function fetchAlertHistory(): Promise<GlobalAlertPayload[]> {
  const res = await fetch('/api/weather/alerts/history');
  if (!res.ok) throw new Error('Failed to load alert history');
  const data = (await res.json()) as { alerts: GlobalAlertPayload[] };
  return data.alerts;
}

// Same response shape as fetchForecast — the server route reuses the same
// daily-block parsing, just with past_days instead of forecast_days.
export async function fetchHistory(cityId: string): Promise<ForecastResponse> {
  const res = await fetch(`/api/weather/history?city=${encodeURIComponent(cityId)}`);
  if (!res.ok) throw new Error('Failed to load weather history');
  return res.json() as Promise<ForecastResponse>;
}
