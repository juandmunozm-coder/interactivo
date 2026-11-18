import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// WebXR exige un contexto seguro. Con HTTPS (certificado local) el Meta Quest
// puede abrir https://<IP-de-tu-PC>:5173 desde la misma red Wi-Fi.
// `npm run dev:http` arranca sin HTTPS (solo para probar el modo demo en el PC).
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'http' ? [] : [basicSsl()],
  server: { host: true, port: mode === 'http' ? 5180 : 5173 },
  preview: { host: true, port: 4173 },
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 },
}));
