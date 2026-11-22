// A module outside the registry reading a category module directly: the rule refuses this import.
import { sampleTemplates } from '../lib/generator/templates/sample-category'
import { allTemplates } from '../lib/generator/templates/index'

export const listed = [...sampleTemplates, ...allTemplates]
