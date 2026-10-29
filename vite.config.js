import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Domain root. A relative base would resolve built assets under the current
  // path, so a refresh of /studio/orders would request /studio/assets.
  base: '/',
  plugins: [react()],
  server: {
    port: 5199,
    proxy: { '/api': 'http://127.0.0.1:8787' },
  },
});
