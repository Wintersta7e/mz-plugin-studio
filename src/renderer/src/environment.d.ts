/// <reference types="vite/client" />

import type { API } from '../../shared/ipc-types'

declare global {
  const __APP_VERSION__: string
  var api: API
  interface Window {
    api: API
  }
}

export {}
