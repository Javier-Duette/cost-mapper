import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    headers: {
      // Habilita crossOriginIsolated para permitir SharedArrayBuffer (web-ifc multithread cuando aplique).
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    proxy: {
      '/api': {
        // Usar IPv4 explícito para evitar problemas de resolución localhost -> ::1 (backend suele bindear en 127.0.0.1).
        target: 'http://127.0.0.1:8002',
        changeOrigin: true,
      },
    },
  },
})
