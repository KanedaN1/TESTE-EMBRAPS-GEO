import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api-contele': {
        target: 'https://integration.contelege.com.br/v2',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-contele/, ''),
      },
      '/api-gemini': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-gemini/, ''),
      }
    }
  }
})
