import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // '@/...' -> 'src/...', the import alias shadcn/ui components expect.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Proxy API calls to the Fastify server in dev, so the client can fetch
    // '/api/...' without hardcoding the backend port or dealing with CORS.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
