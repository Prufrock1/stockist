import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative asset paths: the build works served from a domain root *or* from a
  // subpath (e.g. user.github.io/stockist) without rebuilding. Safe today because
  // routing is in-memory; revisit if a real router is added.
  base: './',
  plugins: [react()],
  server: { port: 5199 },
});
