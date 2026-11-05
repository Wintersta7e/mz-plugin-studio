import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import pkg from './package.json'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version)
    },
    resolve: {
      alias: [
        { find: '@renderer', replacement: resolve('src/renderer/src') },
        { find: '@', replacement: resolve('src/renderer/src') },
        // The code editor imports its own copy of the HTML sanitizer, which lags the fixed
        // release; this sends that one import to the dompurify package the lockfile pins
        { find: /^\.\/dompurify\/dompurify\.js$/, replacement: 'dompurify' }
      ]
    },
    plugins: [react(), tailwindcss()]
  }
})
