import path from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import packageJson from './package.json'

export default defineConfig({
  // Dependencies stay external in the main and preload bundles: electron-vite's default
  main: {},
  preload: {},
  renderer: {
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version)
    },
    resolve: {
      alias: [
        { find: '@renderer', replacement: path.resolve('src/renderer/src') },
        { find: '@', replacement: path.resolve('src/renderer/src') },
        // The code editor imports its own copy of the HTML sanitizer, which lags the fixed
        // release; this sends that one import to the dompurify package the lockfile pins
        { find: /^\.\/dompurify\/dompurify\.js$/, replacement: 'dompurify' }
      ]
    },
    plugins: [react(), tailwindcss()]
  }
})
