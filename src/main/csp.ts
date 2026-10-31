// Content Security Policy — blocks injected scripts and unsafe content
// Dev mode needs 'unsafe-inline' and 'unsafe-eval' for Vite HMR
// Monaco editor loads from cdn.jsdelivr.net — must be allowed in script-src
const monacoCdn = 'https://cdn.jsdelivr.net'

export const DEV_SERVER_CSP = `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' ${monacoCdn}; style-src 'self' 'unsafe-inline' ${monacoCdn}; font-src 'self' data: ${monacoCdn}; img-src 'self' data:; connect-src 'self' ws://localhost:* http://localhost:*; worker-src 'self' blob: ${monacoCdn}`
export const PRODUCTION_CSP = `default-src 'self'; script-src 'self' ${monacoCdn}; style-src 'self' 'unsafe-inline' ${monacoCdn}; font-src 'self' data: ${monacoCdn}; img-src 'self' data:; worker-src 'self' blob: ${monacoCdn}`
