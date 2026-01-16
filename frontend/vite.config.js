import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
    proxy: {
      '/capture': 'http://127.0.0.1:9000',
      '/ocr': 'http://127.0.0.1:9000',
      '/translate': 'http://127.0.0.1:9000',
      '/tts': 'http://127.0.0.1:9000',
      '/pipeline': 'http://127.0.0.1:9000',
      '/audio': 'http://127.0.0.1:9000',
      '/stored-images': 'http://127.0.0.1:9000',
      '/esp32-stream': 'http://127.0.0.1:9000',
      '/esp32-frame': 'http://127.0.0.1:9000',
    },
  },
})
