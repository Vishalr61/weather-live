import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      // WebSocket upgrade must be proxied separately — without ws:true the
      // Socket.IO handshake stalls at the polling fallback in dev.
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
});
