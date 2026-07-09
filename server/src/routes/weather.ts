import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { cities, findCity } from '../data/cities.js';
import type { City } from '../data/cities.js';
import { describeWeatherCode } from '../weather/wmoDescriptions.js';
import { getAlertHistory } from '../weather/alertHistory.js';
import { fetchDailyBlock } from '../weather/openMeteoClient.js';
import { pushRateLimit } from '../middleware/rateLimit.js';
import type { PollResult, WeatherPollerHandle } from '../weather/poller.js';

const WeatherQuery = z.object({
  city: z.string().min(1),
});

// Shared by every route below that takes ?city= — writes the 400/404
// response itself and returns undefined so the caller can just `if (!city) return;`.
function resolveCityFromQuery(req: Request, res: Response): City | undefined {
  const result = WeatherQuery.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ error: 'city query param is required' });
    return undefined;
  }
  const city = findCity(result.data.city);
  if (!city) {
    res.status(404).json({ error: 'unknown city' });
    return undefined;
  }
  return city;
}

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
  // Rate-limited like /api/messages — same "unauthenticated by design"
  // reasoning, plus this one also spends a real Open-Meteo request each call.
  router.post('/poll-now', pushRateLimit, async (_req, res) => {
    const result: PollResult = await pollNow();
    res.json({ ok: true, ...result });
  });

  router.get('/', async (req, res) => {
    const city = resolveCityFromQuery(req, res);
    if (!city) return;

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

  // Alerts persisted to disk (server/.data/alert-history.json) — survives a
  // server restart, unlike the alert-state tracker or the connected-client
  // list, so a freshly-loaded client can see what fired before it connected.
  router.get('/alerts/history', (_req, res) => {
    res.json({ alerts: getAlertHistory() });
  });

  // timezone=auto (used by fetchDailyBlock) so Open-Meteo buckets each day
  // by the city's own local date, not UTC — otherwise "today" could already
  // show tomorrow's data for cities east of Greenwich.
  router.get('/forecast', async (req, res) => {
    const city = resolveCityFromQuery(req, res);
    if (!city) return;

    const days = await fetchDailyBlock(city, { pastDays: 0, forecastDays: 7 });
    if (!days) {
      res.status(502).json({ error: 'weather service unavailable' });
      return;
    }

    res.json({
      city: city.label,
      cityId: city.id,
      days: days.map((d) => ({ ...d, description: describeWeatherCode(d.weatherCode) })),
    });
  });

  // Trend leading up to today — same daily block as /forecast, just past_days
  // instead of forecast_days. Today is included (forecastDays: 1) so the
  // sparkline doesn't end one day short of "now".
  router.get('/history', async (req, res) => {
    const city = resolveCityFromQuery(req, res);
    if (!city) return;

    const days = await fetchDailyBlock(city, { pastDays: 7, forecastDays: 1 });
    if (!days) {
      res.status(502).json({ error: 'weather service unavailable' });
      return;
    }

    res.json({
      city: city.label,
      cityId: city.id,
      days: days.map((d) => ({ ...d, description: describeWeatherCode(d.weatherCode) })),
    });
  });

  return router;
}
