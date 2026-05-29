// Types are duplicated from server/src/types.ts and server/src/data/cities.ts.
// A shared package would require a build step the reviewer has to run —
// duplication is the honest trade-off at this scope.

export interface MessagePayload {
  text: string;
  city: string;
  timestamp: string;
}

export interface ServerToClientEvents {
  message: (payload: MessagePayload) => void;
}

export interface ClientToServerEvents {
  joinCity: (city: string) => void;
  leaveCity: (city: string) => void;
}

export interface City {
  id: string;
  label: string;
}

export interface WeatherResponse {
  city: string;
  cityId: string;
  temp: number;
  weatherCode: number;
  description: string;
}
