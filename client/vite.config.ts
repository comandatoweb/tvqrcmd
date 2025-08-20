import { defineConfig } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
// Carga variables de entorno desde el .env en la raíz del proyecto (monorepo)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PUBLIC_URL = process.env.PUBLIC_URL || '';
const SERVER_URL = process.env.SERVER_URL || '';

export default defineConfig({
  base: PUBLIC_URL,
  server: {
    // Bind a localhost IPv4 para evitar errores EPERM en ::1
    host: '127.0.0.1',
    fs: {
      allow: ['..'],
    },
    proxy: {
      '/rooms':  { target: SERVER_URL, changeOrigin: true },
      '/health': { target: SERVER_URL, changeOrigin: true },
      '/sync':   { target: SERVER_URL, ws: true, changeOrigin: true },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
