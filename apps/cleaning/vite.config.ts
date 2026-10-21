import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({ envDir: '../..', base: process.env.CLEANING_BASE || '/cleaning/', plugins: [react()], build: { assetsDir: 'cleaning-assets' } });
