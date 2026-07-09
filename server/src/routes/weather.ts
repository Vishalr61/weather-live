import { Router } from 'express';
import { z } from 'zod';
import { cities, findCity } from '../data/cities.js';
import { describeWeatherCode } from '../weather/wmoDescriptions.js';
import type { PollResult, WeatherPollerHandle } from '../weather/poller.js';

const WeatherQuery = z.object({
  city: z.string().min(1),
});

// Factory pattern, matching messagesRouter(io) — needs the poller's cached
// snapshot and a way to trigger an on-demand poll cycle.
export function weatherRouter(
  getSnapshot: WeatherPollerHandle['getLatestSnapshot'],
  pollNow: WeatherPollerHandle['pollOnce']
): Router {
  const router = Router();

  router.get('/cities', (_req, res) => {
    res.json(cities.map(({ id, label, lat, lng }) => ({ id, label, lat, lng })));
  });

  // Cached result of the background poller — lets the globe paint marker
  // colors immediately on page load instead of waiting for the next cycle.
  router.get('/batch', (_req, res) => {
    const snapshot = getSnapshot();
    if (!snapshot) {
      res.status(503).json({ error: 'weather data not yet available' });
      return;
    }
    res.json(snapshot);
  });

  // Forces one real poll cycle immediately, against live Open-Meteo data —
  // the honest replacement for the old "fake curl demo": it runs the actual
  // detection pipeline on demand rather than fabricating an event.
  router.post('/poll-now', async (_req, res) => {
    const result: PollResult = await pollNow();
    res.json({ ok: true, ...result });
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

    const data = (await upstream.json()) as {
      current: { temperature_2m: number; weather_code: number };
    };

    res.json({
      city: city.label,
      cityId: city.id,
      temp: data.current.temperature_2m,
      weatherCode: data.current.weather_code,
      description: describeWeatherCode(data.current.weather_code),
    });
  });

  router.get('/forecast', async (req, res) => {
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

    // timezone=auto so Open-Meteo buckets each day by the city's own local
    // date, not UTC — otherwise "today" could already show tomorrow's data
    // for cities east of Greenwich.
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${city.lat}&longitude=${city.lng}` +
      `&daily=temperature_2m_max,temperature_2m_min,weather_code` +
      `&forecast_days=7&temperature_unit=celsius&timezone=auto`;

    const upstream = await fetch(url);
    if (!upstream.ok) {
      res.status(502).json({ error: 'weather service unavailable' });
      return;
    }

    const data = (await upstream.json()) as {
      daily: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; weather_code: number[] };
    };

    const days = data.daily.time.map((date, i) => ({
      date,
      tempMax: data.daily.temperature_2m_max[i],
      tempMin: data.daily.temperature_2m_min[i],
      weatherCode: data.daily.weather_code[i],
      description: describeWeatherCode(data.daily.weather_code[i]),
    }));

    res.json({ city: city.label, cityId: city.id, days });
  });

  return router;
}
