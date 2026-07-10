import { z } from 'zod';

// The upstream schema was trusted implicitly before this — a field rename or
// a temporarily-missing value from Open-Meteo would silently produce NaN/
// undefined that flows all the way to the client instead of a clear failure
// at the point of ingestion.

// Used by GET /api/weather — current conditions plus today's sunrise/
// sunset/UV-max, which are daily-block fields even though they describe
// "right now" from a display perspective. One combined Open-Meteo call
// (current= and daily= together) rather than two requests.
export const CurrentConditionsSchema = z.object({
  current: z.object({
    time: z.string(),
    temperature_2m: z.number(),
    weather_code: z.number(),
    wind_speed_10m: z.number(),
    wind_direction_10m: z.number(),
    relative_humidity_2m: z.number(),
    apparent_temperature: z.number(),
    cloud_cover: z.number(),
  }),
  daily: z.object({
    sunrise: z.array(z.string()).length(1),
    sunset: z.array(z.string()).length(1),
    uv_index_max: z.array(z.number()).length(1),
  }),
});

export const BatchedCurrentConditionsSchema = z.object({
  current: z.object({
    temperature_2m: z.number(),
    weather_code: z.number(),
    wind_speed_10m: z.number(),
    precipitation: z.number(),
  }),
});

export const DailyBlockSchema = z
  .object({
    daily: z.object({
      time: z.array(z.string()),
      temperature_2m_max: z.array(z.number()),
      temperature_2m_min: z.array(z.number()),
      weather_code: z.array(z.number()),
    }),
  })
  .refine(
    ({ daily }) =>
      daily.temperature_2m_max.length === daily.time.length &&
      daily.temperature_2m_min.length === daily.time.length &&
      daily.weather_code.length === daily.time.length,
    { message: 'daily block arrays have mismatched lengths' }
  );

// forecast_hours=N (rather than forecast_days) gives exactly the next N
// hours starting from the current hour, not from local midnight — no
// client- or server-side filtering needed to drop already-passed hours.
export const HourlyBlockSchema = z
  .object({
    hourly: z.object({
      time: z.array(z.string()),
      temperature_2m: z.array(z.number()),
      weather_code: z.array(z.number()),
      precipitation_probability: z.array(z.number()),
    }),
  })
  .refine(
    ({ hourly }) =>
      hourly.temperature_2m.length === hourly.time.length &&
      hourly.weather_code.length === hourly.time.length &&
      hourly.precipitation_probability.length === hourly.time.length,
    { message: 'hourly block arrays have mismatched lengths' }
  );
