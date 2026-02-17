import { useState, useEffect, useRef } from 'react'
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Copy,
  Download,
  Upload,
  Bookmark
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Switch } from '../ui/switch'
import { ScrollArea } from '../ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '../ui/dialog'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '../ui/dropdown-menu'
import { usePluginStore, useProjectStore, useSettingsStore } from '../../stores'
import { createEmptyParameter, type PluginParameter, type ParamType } from '../../types/plugin'
import { generateParameterComment } from '../../lib/generator'
import { serializeParams, deserializeParams, duplicateParams } from '../../lib/param-io'
import { cn } from '../../lib/utils'

const PARAM_TYPES: { value: ParamType; label: string }[] = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'select', label: 'Select/Combo' },
  { value: 'note', label: 'Note (Multiline)' },
  { value: 'variable', label: 'Variable' },
  { value: 'switch', label: 'Switch' },
  { value: 'actor', label: 'Actor' },
  { value: 'class', label: 'Class' },
  { value: 'skill', label: 'Skill' },
  { value: 'item', label: 'Item' },
  { value: 'weapon', label: 'Weapon' },
  { value: 'armor', label: 'Armor' },
  { value: 'enemy', label: 'Enemy' },
  { value: 'troop', label: 'Troop' },
  { value: 'state', label: 'State' },
  { value: 'animation', label: 'Animation' },
  { value: 'tileset', label: 'Tileset' },
  { value: 'common_event', label: 'Common Event' },
  { value: 'file', label: 'File' },
  { value: 'color', label: 'Color' },
  { value: 'text', label: 'Text (Multiline)' },
  { value: 'struct', label: 'Struct' },
  { value: 'array', label: 'Array' }
]

export function ParameterBuilder() {
  const parameters = usePluginStore((s) => s.plugin.parameters)
  const plugin = usePluginStore((s) => s.plugin)
  const structs = usePluginStore((s) => s.plugin.structs)
  const addParameter = usePluginStore((s) => s.addParameter)
  const updateParameter = usePluginStore((s) => s.updateParameter)
  const removeParameter = usePluginStore((s) => s.removeParameter)
  const removeParameters = usePluginStore((s) => s.removeParameters)
  const switches = useProjectStore((s) => s.switches)
  const variables = useProjectStore((s) => s.variables)
  const actors = useProjectStore((s) => s.actors)
  const items = useProjectStore((s) => s.items)
  const parameterPresets = useSettingsStore((s) => s.parameterPresets)
  const savePreset = useSettingsStore((s) => s.savePreset)

  const customCode = usePluginStore((s) => s.plugin.customCode)
  const setCustomCode = usePluginStore((s) => s.setCustomCode)

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Import picker state
  const [importPickerOpen, setImportPickerOpen] = useState(false)
  const [importPickerParams, setImportPickerParams] = useState<PluginParameter[]>([])
  const [importPickerSelected, setImportPickerSelected] = useState<Set<string>>(new Set())

  // Preset name dialog state
  const [presetNameOpen, setPresetNameOpen] = useState(false)
  const [presetNameValue, setPresetNameValue] = useState('')
  const presetSavingRef = useRef(false)

  // Clear selection when plugin changes (e.g. open different file, undo/redo)
  const pluginId = plugin.id
  useEffect(() => {
    setSelectedIds(new Set())
  }, [pluginId])

  const selectedParams = parameters.filter((p) => selectedIds.has(p.id))
  const hasSelection = selectedIds.size > 0

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selectedIds.size === parameters.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(parameters.map((p) => p.id)))
    }
  }

  const handleDuplicate = () => {
    const duped = duplicateParams(selectedParams)
    for (const p of duped) {
      addParameter(p)
    }
    setSelectedIds(new Set())
  }

  const handleBulkDelete = async () => {
    const count = selectedIds.size
    const ids = Array.from(selectedIds)
    const result = await window.api.dialog.message({
      type: 'question',
      title: 'Delete Parameters',
      message: 'Delete ' + count + ' selected parameter' + (count > 1 ? 's' : '') + '?',
      buttons: ['Cancel', 'Delete']
    })
    if (result === 1) {
      removeParameters(ids)
      setSelectedIds(new Set())
    }
  }

  const handleExport = async () => {
    const filePath = await window.api.dialog.saveFile({
      defaultPath: plugin.meta.name + '-params.mzparams',
      filters: [{ name: 'MZ Parameters', extensions: ['mzparams'] }]
    })
    if (!filePath) return
    try {
      const content = serializeParams(selectedParams, plugin.meta.name)
      await window.api.plugin.saveToPath(filePath, content)
    } catch (error) {
      await window.api.dialog.message({
        type: 'error',
        title: 'Export Failed',
        message: error instanceof Error ? error.message : String(error)
      })
    }
  }

  const handleImportFromFile = async () => {
    const filePath = await window.api.dialog.openFile({
      filters: [{ name: 'MZ Parameters', extensions: ['mzparams'] }]
    })
    if (!filePath) return
    try {
      const content = await window.api.plugin.readByPath(filePath)
      const result = deserializeParams(content)
      if (!result.success) {
        await window.api.dialog.message({
          type: 'error',
          title: 'Import Failed',
          message: result.error || 'Unknown error'
        })
        return
      }
      for (const p of result.parameters) {
        addParameter(p)
      }
    } catch (error) {
      await window.api.dialog.message({
        type: 'error',
        title: 'Import Failed',
        message: 'Could not read the file. ' + (error instanceof Error ? error.message : String(error))
      })
    }
  }

  const handleImportFromPlugin = async () => {
    const filePath = await window.api.dialog.openFile({
      filters: [{ name: 'JavaScript Plugin', extensions: ['js'] }]
    })
    if (!filePath) return
    try {
      const content = await window.api.plugin.readByPath(filePath)
      const parsed = await window.api.plugin.parse(content)
      if (!parsed.parameters || parsed.parameters.length === 0) {
        await window.api.dialog.message({
          type: 'info',
          title: 'No Parameters',
          message: 'This plugin has no parameters to import.'
        })
        return
      }
      setImportPickerParams(parsed.parameters)
      setImportPickerSelected(new Set(parsed.parameters.map((p) => p.id)))
      setImportPickerOpen(true)
    } catch (error) {
      await window.api.dialog.message({
        type: 'error',
        title: 'Import Failed',
        message: 'Could not read or parse the plugin file. ' + (error instanceof Error ? error.message : String(error))
      })
    }
  }

  const handleSavePreset = () => {
    setPresetNameValue('')
    setPresetNameOpen(true)
  }

  const handleConfirmSavePreset = async () => {
    if (presetSavingRef.current) return
    presetSavingRef.current = true
    try {
      const trimmed = presetNameValue.trim()
      if (!trimmed) return
      if (parameterPresets[trimmed]) {
        const overwrite = await window.api.dialog.message({
          type: 'question',
          title: 'Overwrite Preset',
          message: `A preset named "${trimmed}" already exists. Overwrite it?`,
          buttons: ['Cancel', 'Overwrite']
        })
        if (overwrite !== 1) return
      }
      savePreset(trimmed, selectedParams)
      setPresetNameOpen(false)
    } finally {
      presetSavingRef.current = false
    }
  }

  const handleApplyPreset = (name: string) => {
    const presetParams = parameterPresets[name]
    if (!presetParams) return
    const imported = presetParams.map((p) => ({
      ...p,
      id: crypto.randomUUID()
    }))
    for (const p of imported) {
      addParameter(p)
    }
  }

  const handleAddParameter = () => {
    const param = createEmptyParameter()
    addParameter(param)
    setExpandedId(param.id)

    // Inject parameter usage comment into customCode
    const comment = generateParameterComment(param)
    const current = customCode || ''
    setCustomCode(current ? `${current}\n\n${comment}` : comment)
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
    // Create a minimal drag image
    const dragImage = document.createElement('div')
    dragImage.style.cssText = 'position:absolute;top:-1000px;width:200px;height:40px;background:#333;border-radius:8px;'
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 100, 20)
    setTimeout(() => document.body.removeChild(dragImage), 0)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) return

    const fromIndex = parameters.findIndex((p) => p.id === draggedId)
    const toIndex = parameters.findIndex((p) => p.id === targetId)

    usePluginStore.getState().reorderParameters(fromIndex, toIndex)
    setDraggedId(null)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col border-b border-border">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-lg font-semibold">Parameters</h2>
          <Button size="sm" onClick={handleAddParameter}>
            <Plus className="mr-1 h-4 w-4" />
            Add Parameter
          </Button>
        </div>

        {/* Toolbar - visible when parameters exist */}
        {parameters.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 border-t border-border px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAll}
              className="text-xs text-muted-foreground"
            >
              <CheckSquare className="mr-1 h-3.5 w-3.5" />
              {selectedIds.size === parameters.length ? 'Deselect' : 'Select All'}
            </Button>

            <div className="mx-1 h-4 w-px bg-border" />

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDuplicate}
              disabled={!hasSelection}
              className="text-xs"
            >
              <Copy className="mr-1 h-3.5 w-3.5" /> Duplicate
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleBulkDelete}
              disabled={!hasSelection}
              className="text-xs text-destructive"
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
            </Button>

            <div className="mx-1 h-4 w-px bg-border" />

            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              disabled={!hasSelection}
              className="text-xs"
            >
              <Download className="mr-1 h-3.5 w-3.5" /> Export
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs">
                  <Upload className="mr-1 h-3.5 w-3.5" /> Import
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleImportFromFile}>
                  From File (.mzparams)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleImportFromPlugin}>
                  From Plugin (.js)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs">
                  <Bookmark className="mr-1 h-3.5 w-3.5" /> Presets
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleSavePreset} disabled={!hasSelection}>
                  Save Selection as Preset...
                </DropdownMenuItem>
                {Object.keys(parameterPresets).length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    {Object.entries(parameterPresets).map(([name, params]) => (
                      <DropdownMenuItem key={name} onClick={() => handleApplyPreset(name)}>
                        {name} ({params.length} params)
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {parameters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <p>No parameters defined</p>
              <p className="text-sm">Click "Add Parameter" to create one</p>
            </div>
          ) : (
            parameters.map((param) => (
              <ParameterCard
                key={param.id}
                param={param}
                expanded={expandedId === param.id}
                isSelected={selectedIds.has(param.id)}
                onToggleSelect={() => toggleSelect(param.id)}
                onToggle={() => setExpandedId(expandedId === param.id ? null : param.id)}
                onUpdate={(updates) => {
                  updateParameter(param.id, updates)
                  if (
                    (updates.name !== undefined && updates.name !== param.name) ||
                    (updates.type !== undefined && updates.type !== param.type)
                  ) {
                    const current = customCode || ''
                    const oldComment = generateParameterComment(param)
                    const newComment = generateParameterComment({
                      ...param,
                      ...updates
                    } as PluginParameter)
                    const updated = current.replace(oldComment, newComment)
                    if (updated !== current) {
                      setCustomCode(updated)
                    }
                  }
                }}
                onDelete={() => {
                  removeParameter(param.id)
                  setSelectedIds((prev) => {
                    if (!prev.has(param.id)) return prev
                    const next = new Set(prev)
                    next.delete(param.id)
                    return next
                  })
                }}
                onDragStart={(e) => handleDragStart(e, param.id)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, param.id)}
                isDragging={draggedId === param.id}
                structs={structs.map((s) => s.name)}
                switches={switches}
                variables={variables}
                actors={actors}
                items={items}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Preset Name dialog */}
      <Dialog open={presetNameOpen} onOpenChange={(open) => {
        if (!open) setPresetNameValue('')
        setPresetNameOpen(open)
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save Preset</DialogTitle>
            <DialogDescription>
              Enter a name for this parameter preset ({selectedParams.length} parameter{selectedParams.length !== 1 ? 's' : ''})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="preset-name">Preset Name</Label>
            <Input
              id="preset-name"
              value={presetNameValue}
              onChange={(e) => setPresetNameValue(e.target.value)}
              placeholder="My Preset"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleConfirmSavePreset()
                }
              }}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setPresetNameOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!presetNameValue.trim()}
              onClick={handleConfirmSavePreset}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import from Plugin picker dialog */}
      <Dialog open={importPickerOpen} onOpenChange={setImportPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Parameters from Plugin</DialogTitle>
            <DialogDescription>
              Select parameters to import ({importPickerParams.length} found)
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 pb-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => {
                if (importPickerSelected.size === importPickerParams.length) {
                  setImportPickerSelected(new Set())
                } else {
                  setImportPickerSelected(new Set(importPickerParams.map((p) => p.id)))
                }
              }}
            >
              {importPickerSelected.size === importPickerParams.length
                ? 'Deselect All'
                : 'Select All'}
            </Button>
          </div>
          <ScrollArea className="max-h-80">
            <div className="space-y-1 pr-4">
              {importPickerParams.map((param) => (
                <label
                  key={param.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={importPickerSelected.has(param.id)}
                    onChange={() => {
                      const next = new Set(importPickerSelected)
                      if (next.has(param.id)) next.delete(param.id)
                      else next.add(param.id)
                      setImportPickerSelected(next)
                    }}
                    className="h-4 w-4"
                  />
                  <span className="font-medium">{param.text || param.name}</span>
                  <span className="text-muted-foreground">({param.type})</span>
                </label>
              ))}
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setImportPickerOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={importPickerSelected.size === 0}
              onClick={() => {
                const toImport = importPickerParams
                  .filter((p) => importPickerSelected.has(p.id))
                  .map((p) => ({ ...p, id: crypto.randomUUID() }))
                for (const p of toImport) addParameter(p)
                setImportPickerOpen(false)
                setImportPickerParams([])
                setImportPickerSelected(new Set())
              }}
            >
              Import {importPickerSelected.size} Parameter
              {importPickerSelected.size !== 1 ? 's' : ''}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface ParameterCardProps {
  param: PluginParameter
  expanded: boolean
  isSelected: boolean
  onToggleSelect: () => void
  onToggle: () => void
  onUpdate: (updates: Partial<PluginParameter>) => void
  onDelete: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  isDragging: boolean
  structs: string[]
  switches: { id: number; name: string }[]
  variables: { id: number; name: string }[]
  actors: { id: number; name: string }[]
  items: { id: number; name: string }[]
}

function ParameterCard({
  param,
  expanded,
  isSelected,
  onToggleSelect,
  onToggle,
  onUpdate,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragging,
  structs,
  switches,
  variables,
  actors,
  items
}: ParameterCardProps) {
  // Helper to get the appropriate game data array based on param type
  const getGameDataOptions = () => {
    switch (param.type) {
      case 'variable':
        return variables
      case 'switch':
        return switches
      case 'actor':
        return actors
      case 'item':
        return items
      default:
        return []
    }
  }

  const isGameDataType = ['variable', 'switch', 'actor', 'item'].includes(param.type)
  const gameDataOptions = getGameDataOptions()
  const hasProjectData = gameDataOptions.length > 0
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card transition-colors',
        isDragging && 'opacity-50'
      )}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Header */}
      <div
        className="flex cursor-pointer items-center gap-2 p-3"
        onClick={onToggle}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation()
            onToggleSelect()
          }}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-muted-foreground"
        />
        <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <div className="flex-1">
          <span className="font-medium">{param.text || param.name}</span>
          <span className="ml-2 text-sm text-muted-foreground">({param.type})</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Internal Name</Label>
              <Input
                value={param.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="paramName"
              />
            </div>
            <div className="space-y-2">
              <Label>Display Label</Label>
              <Input
                value={param.text}
                onChange={(e) => onUpdate({ text: e.target.value })}
                placeholder="Parameter Label"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={param.desc}
              onChange={(e) => onUpdate({ desc: e.target.value })}
              placeholder="Help text for this parameter"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={param.type}
                onValueChange={(value: ParamType) => onUpdate({ type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PARAM_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Default Value</Label>
              {isGameDataType ? (
                hasProjectData ? (
                  <Select
                    value={String(param.default ?? '')}
                    onValueChange={(v) => onUpdate({ default: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${param.type}...`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">None (0)</SelectItem>
                      {gameDataOptions.map((opt) => (
                        <SelectItem key={opt.id} value={String(opt.id)}>
                          {opt.id}: {opt.name || `(unnamed ${param.type})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    disabled
                    placeholder="Load project first"
                    className="text-muted-foreground"
                  />
                )
              ) : param.type === 'boolean' ? (
                <div className="flex items-center h-10">
                  <Switch
                    checked={param.default === true || param.default === 'true'}
                    onCheckedChange={(checked) => onUpdate({ default: checked })}
                  />
                </div>
              ) : (
                <Input
                  value={String(param.default || '')}
                  onChange={(e) => {
                    const val = param.type === 'number' ? Number(e.target.value) : e.target.value
                    onUpdate({ default: val })
                  }}
                  type={param.type === 'number' ? 'number' : 'text'}
                  placeholder="Default value"
                />
              )}
            </div>
          </div>

          {/* Boolean-specific fields: @on/@off labels */}
          {param.type === 'boolean' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>On Label</Label>
                <Input
                  value={param.onLabel || ''}
                  onChange={(e) => onUpdate({ onLabel: e.target.value || undefined })}
                  placeholder="ON"
                />
              </div>
              <div className="space-y-2">
                <Label>Off Label</Label>
                <Input
                  value={param.offLabel || ''}
                  onChange={(e) => onUpdate({ offLabel: e.target.value || undefined })}
                  placeholder="OFF"
                />
              </div>
            </div>
          )}

          {/* Number-specific fields */}
          {param.type === 'number' && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Min</Label>
                <Input
                  type="number"
                  value={param.min ?? ''}
                  onChange={(e) => onUpdate({ min: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="No min"
                />
              </div>
              <div className="space-y-2">
                <Label>Max</Label>
                <Input
                  type="number"
                  value={param.max ?? ''}
                  onChange={(e) => onUpdate({ max: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="No max"
                />
              </div>
              <div className="space-y-2">
                <Label>Decimals</Label>
                <Input
                  type="number"
                  value={param.decimals ?? ''}
                  onChange={(e) => onUpdate({ decimals: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="0"
                  min={0}
                />
              </div>
            </div>
          )}

          {/* Select options */}
          {param.type === 'select' && (
            <div className="space-y-2">
              <Label>Options (one per line, format: value|label or just label)</Label>
              <Textarea
                value={
                  param.options?.map((o) => (o.value !== o.text ? `${o.value}|${o.text}` : o.text)).join('\n') || ''
                }
                onChange={(e) => {
                  const options = e.target.value.split('\n').filter(Boolean).map((line) => {
                    const [value, text] = line.includes('|') ? line.split('|') : [line, line]
                    return { value: value.trim(), text: (text || value).trim() }
                  })
                  onUpdate({ options })
                }}
                placeholder={"option1|Option 1\noption2|Option 2"}
                rows={4}
                className="font-mono text-sm"
              />
            </div>
          )}

          {/* Struct reference */}
          {param.type === 'struct' && (
            <div className="space-y-2">
              <Label>Struct Type</Label>
              <Select
                value={param.structType || ''}
                onValueChange={(value) => onUpdate({ structType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select struct..." />
                </SelectTrigger>
                <SelectContent>
                  {structs.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Array element type */}
          {param.type === 'array' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Array Element Type</Label>
                <Select
                  value={param.arrayType || 'string'}
                  onValueChange={(value) => onUpdate({ arrayType: value as ParamType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="string">String</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                    <SelectItem value="note">Note (Multiline)</SelectItem>
                    <SelectItem value="select">Select/Combo</SelectItem>
                    <SelectItem value="variable">Variable</SelectItem>
                    <SelectItem value="switch">Switch</SelectItem>
                    <SelectItem value="actor">Actor</SelectItem>
                    <SelectItem value="class">Class</SelectItem>
                    <SelectItem value="skill">Skill</SelectItem>
                    <SelectItem value="item">Item</SelectItem>
                    <SelectItem value="weapon">Weapon</SelectItem>
                    <SelectItem value="armor">Armor</SelectItem>
                    <SelectItem value="enemy">Enemy</SelectItem>
                    <SelectItem value="troop">Troop</SelectItem>
                    <SelectItem value="state">State</SelectItem>
                    <SelectItem value="animation">Animation</SelectItem>
                    <SelectItem value="tileset">Tileset</SelectItem>
                    <SelectItem value="common_event">Common Event</SelectItem>
                    <SelectItem value="file">File</SelectItem>
                    <SelectItem value="struct">Struct</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* If array of structs, show struct type selector */}
              {param.arrayType === 'struct' && (
                <div className="space-y-2">
                  <Label>Struct Type</Label>
                  <Select
                    value={param.structType || ''}
                    onValueChange={(value) => onUpdate({ structType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select struct..." />
                    </SelectTrigger>
                    <SelectContent>
                      {structs.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* File directory */}
          {param.type === 'file' && (
            <div className="space-y-2">
              <Label>Directory (relative to project)</Label>
              <Input
                value={param.dir || ''}
                onChange={(e) => onUpdate({ dir: e.target.value })}
                placeholder="img/pictures"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
