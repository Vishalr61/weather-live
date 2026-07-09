import express from 'express';
import type { Express } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { weatherRouter } from './weather.js';
import type { WeatherSnapshotPayload } from '../types.js';

// The current-weather/forecast/history routes hit real Open-Meteo and are
// deliberately left out here, for the same reason the poller itself is
// untested at this scope: mocking fetch is more effort than this
// portfolio-scale project needs, and they're covered by live curl checks
// instead. Only the routes with no external network dependency are tested.
function buildApp(snapshot: WeatherSnapshotPayload | null): Express {
  const app = express();
  app.use(express.json());
  app.use(
    '/api/weather',
    weatherRouter(
      () => snapshot,
      async () => ({ citySnapshots: [], triggeredAlerts: [] })
    )
  );
  return app;
}

describe('GET /api/weather/cities', () => {
  it('returns all 27 curated cities with id/label/lat/lng', async () => {
    const res = await request(buildApp(null)).get('/api/weather/cities');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(27);
    for (const city of res.body) {
      expect(city).toMatchObject({
        id: expect.any(String),
        label: expect.any(String),
        lat: expect.any(Number),
        lng: expect.any(Number),
      });
    }
  });
});

describe('GET /api/weather/batch', () => {
  it('returns 503 before the poller has completed its first cycle', async () => {
    const res = await request(buildApp(null)).get('/api/weather/batch');
    expect(res.status).toBe(503);
  });

  it('returns the cached snapshot once one exists', async () => {
    const snapshot: WeatherSnapshotPayload = {
      generatedAt: '2026-07-09T00:00:00.000Z',
      cities: [
        { cityId: 'melbourne', label: 'Melbourne', lat: -37.8, lng: 145, temp: 12, weatherCode: 0, severity: 'none' },
      ],
    };
    const res = await request(buildApp(snapshot)).get('/api/weather/batch');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(snapshot);
  });
});

describe('GET /api/weather/alerts/history', () => {
  it('returns an alerts array (empty in a fresh module instance)', async () => {
    const res = await request(buildApp(null)).get('/api/weather/alerts/history');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.alerts)).toBe(true);
  });
});

describe('city-lookup validation shared by the ?city= routes', () => {
  it('returns 400 when city is missing', async () => {
    const res = await request(buildApp(null)).get('/api/weather');
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown city', async () => {
    const res = await request(buildApp(null)).get('/api/weather?city=atlantis');
    expect(res.status).toBe(404);
  });
});
