import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // allows access from phones on the same network via your computer's IP
    port: 5173,
  },
});
