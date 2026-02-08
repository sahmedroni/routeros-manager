import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://34.41.120.192:3001',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://34.41.120.192:3001',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  }

})
