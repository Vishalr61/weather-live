import { z } from 'zod';

// The upstream schema was trusted implicitly before this — a field rename or
// a temporarily-missing value from Open-Meteo would silently produce NaN/
// undefined that flows all the way to the client instead of a clear failure
// at the point of ingestion.

export const CurrentConditionsSchema = z.object({
  current: z.object({
    temperature_2m: z.number(),
    weather_code: z.number(),
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
