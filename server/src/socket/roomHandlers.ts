import type { Server } from 'socket.io';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from '../types.js';

type IOServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

// Sockets can watch multiple city rooms at once — a client's watchlist,
// not a single "current city." Room join/leave is intentionally just that;
// there is no exclusivity logic here, unlike the single-room model this
// replaced.
export function registerRoomHandlers(io: IOServer): void {
  io.on('connection', (socket) => {
    socket.on('watchCity', (city) => {
      socket.join(city);
    });

    socket.on('unwatchCity', (city) => {
      socket.leave(city);
    });
  });
}
