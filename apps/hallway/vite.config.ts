import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.HALLWAY_BASE || '/hallway/',
  plugins: [react()],
  build: { assetsDir: 'hallway-assets' },
});
