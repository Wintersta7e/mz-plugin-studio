// A generator module reading a renderer-only package: the generated output would then depend on
// the process it runs in, so the rule refuses this import.
import { create } from 'zustand'

export const useSample = create(() => ({}))
