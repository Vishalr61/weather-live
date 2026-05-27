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

export interface InterServerEvents {}

export interface SocketData {
  userId: string;
}
