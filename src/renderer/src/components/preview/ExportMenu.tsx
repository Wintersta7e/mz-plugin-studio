import { useState, useRef, useEffect, type ReactNode } from 'react'
import { ChevronDown, FileText, FileType, FileJson } from 'lucide-react'
import { Button } from '../ui/button'
import { useToastStore } from '../../stores'
import { generatePluginsJsonEntry, generateReadme, typeDeclaration } from '../../lib/exportFormats'
import { NOTICE_MS } from '../../stores/toastStore'
import { userMessage } from '../../lib/utilities'
import type { PluginDefinition } from '../../types/plugin'
import log from 'electron-log/renderer'

type ExportFormat = 'readme' | 'dts' | 'plugins-json'

interface ExportFile {
  content: string
  defaultName: string
  filters: { name: string; extensions: string[] }[]
  // What the file declares otherwise than the plugin names it
  notes: string[]
}

function exportFile(format: ExportFormat, plugin: PluginDefinition): ExportFile {
  const name = plugin.meta.name || 'NewPlugin'
  switch (format) {
    case 'readme': {
      return {
        content: generateReadme(plugin),
        defaultName: `${name}_README.md`,
        filters: [{ name: 'Markdown Files', extensions: ['md'] }],
        notes: []
      }
    }
    case 'dts': {
      const declaration = typeDeclaration(plugin)
      return {
        content: declaration.content,
        defaultName: `${name}.d.ts`,
        filters: [{ name: 'TypeScript Declaration', extensions: ['d.ts'] }],
        notes: declaration.notes
      }
    }
    case 'plugins-json': {
      return {
        content: generatePluginsJsonEntry(plugin),
        defaultName: `${name}_plugins-entry.json`,
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
        notes: []
      }
    }
  }
}

// Writes the format to the path the save dialog returns and says how it went
async function exportAs(format: ExportFormat, plugin: PluginDefinition): Promise<void> {
  const { addToast } = useToastStore.getState()
  const { content, defaultName, filters, notes } = exportFile(format, plugin)
  const filePath = await globalThis.api.dialog.saveFile({ defaultPath: defaultName, filters })
  if (filePath === null || filePath === '') return
  try {
    await globalThis.api.plugin.saveToPath(filePath, content)
    if (notes.length === 0) {
      addToast({ type: 'success', message: 'Plugin exported successfully' })
    } else {
      const plural = notes.length > 1 ? 's' : ''
      addToast({
        type: 'warning',
        message: `Exported, with ${String(notes.length)} change${plural} to fit TypeScript: ${notes.join('; ')}`,
        duration: NOTICE_MS
      })
    }
    log.info('[export] Plugin exported')
  } catch (error) {
    log.error('Failed to export:', error)
    addToast({
      type: 'error',
      message: `Export failed: ${userMessage(error)}`,
      duration: NOTICE_MS
    })
  }
}

function ExportItem({
  icon,
  title,
  detail,
  onSelect
}: Readonly<{ icon: ReactNode; title: string; detail: string; onSelect: () => void }>) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
      onClick={onSelect}
    >
      {icon}
      <div className="text-left">
        <div>{title}</div>
        <div className="text-xs text-muted-foreground">{detail}</div>
      </div>
    </button>
  )
}

// The other export formats, in a dropdown that closes on a click outside it
export function ExportMenu({ plugin }: Readonly<{ plugin: PluginDefinition }>) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (event: MouseEvent) => {
      const { target } = event
      if (menuRef.current && !(target instanceof Node && menuRef.current.contains(target))) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('mousedown', handleClick)
    }
  }, [isOpen])

  const handleExportFormat = (format: ExportFormat) => {
    setIsOpen(false)
    void exportAs(format, plugin)
  }

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="outline"
        size="sm"
        className="px-1.5"
        onClick={() => {
          setIsOpen(!isOpen)
        }}
        title="Export in other formats"
      >
        <ChevronDown className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-md border border-border bg-popover p-1 shadow-md">
          <ExportItem
            icon={<FileText className="h-4 w-4 shrink-0" />}
            title="Export README.md"
            detail="Auto-generated documentation"
            onSelect={() => {
              handleExportFormat('readme')
            }}
          />
          <ExportItem
            icon={<FileType className="h-4 w-4 shrink-0" />}
            title="Export .d.ts"
            detail="TypeScript type definitions"
            onSelect={() => {
              handleExportFormat('dts')
            }}
          />
          <ExportItem
            icon={<FileJson className="h-4 w-4 shrink-0" />}
            title="Export plugins.json entry"
            detail="PluginManager configuration"
            onSelect={() => {
              handleExportFormat('plugins-json')
            }}
          />
        </div>
      )}
    </div>
  )
}
