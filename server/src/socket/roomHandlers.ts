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

export function registerRoomHandlers(io: IOServer): void {
  io.on('connection', (socket) => {
    socket.on('joinCity', (city) => {
      // Leave any previously-joined city rooms first — without this, a user
      // who switches city would still receive popups for cities selected
      // earlier in the session.
      for (const room of socket.rooms) {
        if (room !== socket.id) socket.leave(room);
      }
      socket.join(city);
    });

    socket.on('leaveCity', (city) => {
      socket.leave(city);
    });
  });
}
