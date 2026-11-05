import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite = the tool that runs our React site while we build it,
// and builds the final fast version for the contest.
// Port 5173 is just the address on your own computer: http://localhost:5173
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
