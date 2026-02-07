import { useMemo, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { Copy, Download, Check } from 'lucide-react'
import { Button } from '../ui/button'
import { usePluginStore, useProjectStore, useSettingsStore } from '../../stores'
import { generatePlugin, validatePlugin } from '../../lib/generator'
import { useState } from 'react'

export function CodePreview() {
  const plugin = usePluginStore((s) => s.plugin)
  const project = useProjectStore((s) => s.project)
  const setSavedPath = usePluginStore((s) => s.setSavedPath)
  const setDirty = usePluginStore((s) => s.setDirty)

  const editorFontSize = useSettingsStore((s) => s.editorFontSize)
  const editorWordWrap = useSettingsStore((s) => s.editorWordWrap)
  const editorMinimap = useSettingsStore((s) => s.editorMinimap)
  const editorLineNumbers = useSettingsStore((s) => s.editorLineNumbers)

  const [copied, setCopied] = useState(false)

  const code = useMemo(() => {
    try {
      return generatePlugin(plugin)
    } catch (e) {
      console.error('Code generation error:', e)
      return `// Code generation error: ${e instanceof Error ? e.message : String(e)}`
    }
  }, [plugin])

  const validation = useMemo(() => {
    try {
      return validatePlugin(plugin)
    } catch (e) {
      console.error('Validation error:', e)
      return { valid: false, errors: [String(e)], warnings: [] }
    }
  }, [plugin])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  const handleExport = useCallback(async () => {
    if (!project) {
      // Use save dialog if no project
      const filePath = await window.api.dialog.saveFile({
        defaultPath: `${plugin.meta.name || 'NewPlugin'}.js`,
        filters: [{ name: 'JavaScript Files', extensions: ['js'] }]
      })
      if (filePath) {
        try {
          const result = await window.api.plugin.saveToPath(filePath, code)
          if (result.success) {
            setSavedPath(result.path)
            setDirty(false)
          }
        } catch (error) {
          console.error('Failed to save plugin:', error)
        }
      }
      return
    }

    // Save to project plugins folder
    const filename = `${plugin.meta.name || 'NewPlugin'}.js`
    try {
      const result = await window.api.plugin.save(project.path, filename, code)
      if (result.success) {
        setSavedPath(result.path)
        setDirty(false)
      }
    } catch (error) {
      console.error('Failed to save plugin:', error)
    }
  }, [code, plugin.meta.name, project, setSavedPath, setDirty])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h2 className="text-lg font-semibold">Generated Code</h2>
          {!validation.valid && (
            <div className="mt-1 text-sm text-destructive">
              {validation.errors.length} error(s)
            </div>
          )}
          {validation.valid && validation.warnings && validation.warnings.length > 0 && (
            <div className="mt-1 text-sm text-yellow-500">
              {validation.warnings.length} warning(s)
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="mr-1 h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-1 h-4 w-4" />
                Copy
              </>
            )}
          </Button>

          <Button size="sm" onClick={handleExport}>
            <Download className="mr-1 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Validation errors */}
      {!validation.valid && (
        <div className="border-b border-border bg-destructive/10 p-3">
          <ul className="space-y-1 text-sm text-destructive">
            {validation.errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex-1">
        <Editor
          height="100%"
          language="javascript"
          value={code}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: editorMinimap },
            fontSize: editorFontSize,
            lineNumbers: editorLineNumbers ? 'on' : 'off',
            scrollBeyondLastLine: false,
            wordWrap: editorWordWrap ? 'on' : 'off',
            automaticLayout: true,
            padding: { top: 16, bottom: 16 }
          }}
        />
      </div>
    </div>
  )
}
