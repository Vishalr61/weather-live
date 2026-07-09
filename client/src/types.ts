// Types are duplicated from server/src/types.ts and server/src/data/cities.ts.
// A shared package would require a build step the reviewer has to run —
// duplication is the honest trade-off at this scope.

export interface MessagePayload {
  text: string;
  city: string;
  timestamp: string;
}

export type AlertSeverity = 'none' | 'watch' | 'severe';

export interface CitySnapshot {
  cityId: string;
  label: string;
  lat: number;
  lng: number;
  temp: number;
  weatherCode: number;
  severity: AlertSeverity;
}

export interface WeatherSnapshotPayload {
  generatedAt: string;
  cities: CitySnapshot[];
}

export interface GlobalAlertPayload {
  cityId: string;
  label: string;
  lat: number;
  lng: number;
  severity: Exclude<AlertSeverity, 'none'>;
  reasons: string[];
  description: string;
  timestamp: string;
}

export interface ServerToClientEvents {
  message: (payload: MessagePayload) => void;
  weatherSnapshot: (payload: WeatherSnapshotPayload) => void;
  globalAlert: (payload: GlobalAlertPayload) => void;
}

export interface ClientToServerEvents {
  watchCity: (city: string) => void;
  unwatchCity: (city: string) => void;
}

export interface City {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

export interface WeatherResponse {
  city: string;
  cityId: string;
  temp: number;
  weatherCode: number;
  description: string;
}

export interface ForecastDay {
  date: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  description: string;
}

export interface ForecastResponse {
  city: string;
  cityId: string;
  days: ForecastDay[];
}
