import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

vi.mock('@monaco-editor/react', () => import('./monaco-stub'))
