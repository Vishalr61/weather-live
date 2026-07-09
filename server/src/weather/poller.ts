import type { Server } from 'socket.io';
import { cities } from '../data/cities.js';
import { fetchBatchedConditions } from './openMeteoClient.js';
import { evaluateAlert } from './alertRules.js';
import { recordAndCheckEdge } from './alertState.js';
import { describeWeatherCode } from './wmoDescriptions.js';
import { appendAlert, loadAlertHistory } from './alertHistory.js';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  CitySnapshot,
  WeatherSnapshotPayload,
  GlobalAlertPayload,
} from '../types.js';

type IOServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export interface PollResult {
  citySnapshots: CitySnapshot[];
  triggeredAlerts: GlobalAlertPayload[];
}

export interface WeatherPollerHandle {
  stop(): void;
  pollOnce(): Promise<PollResult>;
  getLatestSnapshot(): WeatherSnapshotPayload | null;
}

export function startWeatherPoller(io: IOServer, intervalMs: number): WeatherPollerHandle {
  loadAlertHistory();

  let latestSnapshot: WeatherSnapshotPayload | null = null;
  let inFlight: Promise<PollResult> | null = null;

  async function runPoll(): Promise<PollResult> {
    const conditions = await fetchBatchedConditions(cities);

    const citySnapshots: CitySnapshot[] = [];
    const triggeredAlerts: GlobalAlertPayload[] = [];

    for (const c of conditions) {
      const city = cities.find((city) => city.id === c.cityId);
      if (!city) continue;

      const { severity, reasons } = evaluateAlert(c);
      citySnapshots.push({
        cityId: city.id,
        label: city.label,
        lat: city.lat,
        lng: city.lng,
        temp: c.temp,
        weatherCode: c.weatherCode,
        severity,
      });

      const isNewSevereAlert = recordAndCheckEdge(city.id, severity);
      if (isNewSevereAlert) {
        const description = describeWeatherCode(c.weatherCode);
        const timestamp = new Date().toISOString();

        triggeredAlerts.push({
          cityId: city.id,
          label: city.label,
          lat: city.lat,
          lng: city.lng,
          severity: 'severe',
          reasons,
          description,
          timestamp,
        });

        // Room-targeted — reuses the exact mechanic POST /api/messages uses,
        // just triggered by the poller instead of a curl body.
        io.to(city.id).emit('message', {
          text: `⚠️ ${description} (${reasons.join(', ')})`,
          city: city.label,
          timestamp,
        });

        appendAlert(triggeredAlerts[triggeredAlerts.length - 1]);
      }
    }

    latestSnapshot = { generatedAt: new Date().toISOString(), cities: citySnapshots };
    io.emit('weatherSnapshot', latestSnapshot);
    for (const alert of triggeredAlerts) {
      io.emit('globalAlert', alert);
    }

    return { citySnapshots, triggeredAlerts };
  }

  function pollOnce(): Promise<PollResult> {
    if (!inFlight) {
      inFlight = runPoll()
        .catch((err: unknown) => {
          // An Open-Meteo outage should skip a cycle, not crash the server.
          console.error('weather poll failed:', err);
          return { citySnapshots: latestSnapshot?.cities ?? [], triggeredAlerts: [] };
        })
        .finally(() => {
          inFlight = null;
        });
    }
    return inFlight;
  }

  void pollOnce();
  const timer = setInterval(() => void pollOnce(), intervalMs);

  return {
    stop: () => clearInterval(timer),
    pollOnce,
    getLatestSnapshot: () => latestSnapshot,
  };
}
