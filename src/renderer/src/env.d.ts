/// <reference types="vite/client" />

import type { API } from '../../preload/index'

declare global {
  const __APP_VERSION__: string
  interface Window {
    api: API
  }
}

export {}
