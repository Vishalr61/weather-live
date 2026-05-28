import { Router } from 'express';
import { z } from 'zod';
import { cities, findCity } from '../data/cities.js';

const router = Router();

// WMO weather interpretation codes → human-readable description.
// Full table: https://open-meteo.com/en/docs#weathervariables
const WMO_DESCRIPTIONS: Record<number, string> = {
  0: 'Clear sky',        1: 'Mainly clear',    2: 'Partly cloudy',  3: 'Overcast',
  45: 'Fog',             48: 'Icy fog',
  51: 'Light drizzle',   53: 'Drizzle',        55: 'Heavy drizzle',
  61: 'Light rain',      63: 'Rain',           65: 'Heavy rain',
  71: 'Light snow',      73: 'Snow',           75: 'Heavy snow',
  80: 'Showers',         81: 'Heavy showers',  82: 'Violent showers',
  95: 'Thunderstorm',    96: 'Thunderstorm with hail',
};

router.get('/cities', (_req, res) => {
  res.json(cities.map(({ id, label }) => ({ id, label })));
});

const WeatherQuery = z.object({
  city: z.string().min(1),
});

router.get('/', async (req, res) => {
  const result = WeatherQuery.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ error: 'city query param is required' });
    return;
  }

  const city = findCity(result.data.city);
  if (!city) {
    res.status(404).json({ error: 'unknown city' });
    return;
  }

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${city.lat}&longitude=${city.lng}` +
    `&current=temperature_2m,weather_code` +
    `&temperature_unit=celsius`;

  const upstream = await fetch(url);
  if (!upstream.ok) {
    res.status(502).json({ error: 'weather service unavailable' });
    return;
  }

  const data = await upstream.json() as {
    current: { temperature_2m: number; weather_code: number };
  };

  res.json({
    city: city.label,
    cityId: city.id,
    temp: data.current.temperature_2m,
    weatherCode: data.current.weather_code,
    description: WMO_DESCRIPTIONS[data.current.weather_code] ?? 'Unknown',
  });
});

export default router;
