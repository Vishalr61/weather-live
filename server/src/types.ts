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
  joinCity: (city: string) => void;
  leaveCity: (city: string) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  userId: string;
}
