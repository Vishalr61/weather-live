import { useEffect, useState } from 'react';
import type { AppSocket } from './useSocket.ts';
import type { WeatherSnapshotPayload } from '../types.ts';
import { fetchWeatherBatch } from '../api/weather.ts';

export function useWeatherSnapshot(socket: AppSocket | null): {
  snapshot: WeatherSnapshotPayload | null;
} {
  const [snapshot, setSnapshot] = useState<WeatherSnapshotPayload | null>(null);

  // Initial hydration from the poller's cache — avoids a blank globe while
  // waiting for the next live 'weatherSnapshot' event to arrive.
  useEffect(() => {
    fetchWeatherBatch()
      .then(setSnapshot)
      .catch(() => { /* poller hasn't completed its first cycle yet — live event will arrive shortly */ });
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('weatherSnapshot', setSnapshot);
    return () => {
      socket.off('weatherSnapshot', setSnapshot);
    };
  }, [socket]);

  return { snapshot };
}
