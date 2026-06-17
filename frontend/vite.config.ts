import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // sockjs-client가 브라우저에서 Node.js 전역변수를 참조하는 문제 해결
    global: 'globalThis',
  },
  server: {
    port: 5173,
    proxy: {
      // /api/v1/... → http://localhost:8080/api/v1/...
      // React Router 경로(/travels, /login 등)와 충돌 없이 API만 포워딩
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
