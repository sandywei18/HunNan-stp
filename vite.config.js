import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/orders': 'http://localhost:4000',
      '/ranking': 'http://localhost:4000',
      '/login': 'http://localhost:4000',
      '/portfolio': 'http://localhost:4000',
      '/users': 'http://localhost:4000',
      '/balance': 'http://localhost:4000',
      '/market': 'http://localhost:4000',
      '/ai': 'http://localhost:4000',
      '/chat': 'http://localhost:4000'
    }
  }
})
