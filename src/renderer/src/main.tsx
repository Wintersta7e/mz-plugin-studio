import log from 'electron-log/renderer'
import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/globals.css'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  override state: { error: Error | null } = { error: null }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    log.error('React Error Boundary caught:', error, info.componentStack)
  }

  override render(): ReactNode {
    const { error } = this.state
    return error === null ? (
      this.props.children
    ) : (
      <div
        style={{
          padding: 32,
          fontFamily: 'monospace',
          color: '#ff6b6b',
          background: '#1a1a2e',
          height: '100vh'
        }}
      >
        <h1 style={{ color: '#ff6b6b' }}>Something went wrong</h1>
        <pre style={{ whiteSpace: 'pre-wrap', marginTop: 16, color: '#e0e0e0' }}>
          {error.message}
        </pre>
        <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8, fontSize: 12, color: '#888' }}>
          {error.stack}
        </pre>
        <button
          type="button"
          onClick={() => {
            this.setState({ error: null })
          }}
          style={{
            marginTop: 16,
            padding: '8px 16px',
            background: '#4a4a8a',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Try Again
        </button>
      </div>
    )
  }
}

const root = document.querySelector('#root')
if (!root) throw new Error('Missing root element')

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
