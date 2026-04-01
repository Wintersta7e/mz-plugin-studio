import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '../ui/dropdown-menu'
import { usePluginStore, useProjectStore, useSettingsStore } from '../../stores'
import {
  createEmptyParameter,
  type PluginParameter,
  type ParamType,
  type PluginStruct
} from '../../types/plugin'
import { generateParameterComment } from '../../lib/generator'
import { serializeParams, deserializeParams, duplicateParams } from '../../lib/param-io'
import { cn } from '../../lib/utils'
import { StructDefaultEditor } from './StructDefaultEditor'

const paramCardSpring = { type: 'spring' as const, stiffness: 400, damping: 35 }

interface ParamTypeOption {
  value: ParamType
  label: string
  desc: string
}

interface ParamTypeGroup {
  group: string
  types: ParamTypeOption[]
}

const PARAM_TYPE_GROUPS: ParamTypeGroup[] = [
  {
    group: 'Basic',
    types: [
      { value: 'string', label: 'String', desc: 'Single-line text input' },
      { value: 'number', label: 'Number', desc: 'Numeric value with optional min/max' },
      { value: 'boolean', label: 'Boolean', desc: 'ON/OFF toggle switch' },
      { value: 'color', label: 'Color', desc: 'Hex color picker' },
      { value: 'hidden', label: 'Hidden', desc: 'Internal value, hidden in MZ' }
    ]
  },
  {
    group: 'Text',
    types: [
      { value: 'text', label: 'Text', desc: 'Multi-line text area' },
      { value: 'note', label: 'Note', desc: 'Large multi-line JSON-safe text' }
    ]
  },
  {
    group: 'Lists',
    types: [
      { value: 'select', label: 'Select', desc: 'Fixed dropdown list' },
      { value: 'combo', label: 'Combo', desc: 'Editable dropdown with suggestions' }
    ]
  },
  {
    group: 'Game Data',
    types: [
      { value: 'variable', label: 'Variable', desc: 'Game variable picker' },
      { value: 'switch', label: 'Switch', desc: 'Game switch picker' },
      { value: 'actor', label: 'Actor', desc: 'Actor from database' },
      { value: 'class', label: 'Class', desc: 'Class from database' },
      { value: 'skill', label: 'Skill', desc: 'Skill from database' },
      { value: 'item', label: 'Item', desc: 'Item from database' },
      { value: 'weapon', label: 'Weapon', desc: 'Weapon from database' },
      { value: 'armor', label: 'Armor', desc: 'Armor from database' },
      { value: 'enemy', label: 'Enemy', desc: 'Enemy from database' },
      { value: 'troop', label: 'Troop', desc: 'Troop from database' },
      { value: 'state', label: 'State', desc: 'State from database' },
      { value: 'animation', label: 'Animation', desc: 'Animation from database' },
      { value: 'tileset', label: 'Tileset', desc: 'Tileset from database' },
      { value: 'common_event', label: 'Common Event', desc: 'Common event picker' },
      { value: 'map', label: 'Map', desc: 'Map ID picker' },
      { value: 'icon', label: 'Icon', desc: 'Icon index picker' }
    ]
  },
  {
    group: 'Files',
    types: [{ value: 'file', label: 'File', desc: 'File path relative to project' }]
  },
  {
    group: 'Structure',
    types: [
      { value: 'struct', label: 'Struct', desc: 'Nested object with typed fields' },
      { value: 'array', label: 'Array', desc: 'List of elements of a single type' }
    ]
  }
]

/** Map from param id to param name — lightweight alternative to passing full array (R3-03) */
type ParamNameMap = ReadonlyMap<string, string>

function getParamNameError(
  name: string,
  paramNames: ParamNameMap,
  selfId: string
): string | null {
  if (!name.trim()) return 'Name is required'
  // Allow section dividers (--- or ===)
  if (/^-{3,}$/.test(name) || /^={3,}$/.test(name)) return null
  if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
    return 'Must be a valid identifier (letters, numbers, _, $)'
  }
  for (const [id, n] of paramNames) {
    if (id !== selfId && n === name) return 'Duplicate parameter name'
  }
  return null
}

export function ParameterBuilder() {
  const parameters = usePluginStore((s) => s.plugin.parameters)
  const pluginId = usePluginStore((s) => s.plugin.id)
  const pluginName = usePluginStore((s) => s.plugin.meta.name)
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

  const setCustomCode = usePluginStore((s) => s.setCustomCode)

  const structNames = useMemo(() => structs.map((s) => s.name), [structs])
  // Lightweight map for duplicate name checking — stable ref when names don't change (R3-03)
  const paramNameMap: ParamNameMap = useMemo(
    () => new Map(parameters.map((p) => [p.id, p.name])),
    [parameters]
  )

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const draggedIdRef = useRef<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)

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
  useEffect(() => {
    setSelectedIds(new Set())
  }, [pluginId])

  const selectedParams = useMemo(
    () => parameters.filter((p) => selectedIds.has(p.id)),
    [parameters, selectedIds]
  )
  const hasSelection = selectedIds.size > 0

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

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
      defaultPath: pluginName + '-params.mzparams',
      filters: [{ name: 'MZ Parameters', extensions: ['mzparams'] }]
    })
    if (!filePath) return
    try {
      const content = serializeParams(selectedParams, pluginName)
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
        message:
          'Could not read the file. ' + (error instanceof Error ? error.message : String(error))
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
        message:
          'Could not read or parse the plugin file. ' +
          (error instanceof Error ? error.message : String(error))
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
  }

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedId(id)
    draggedIdRef.current = id
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
    // Create a minimal drag image
    const dragImage = document.createElement('div')
    dragImage.style.cssText =
      'position:absolute;top:-1000px;width:200px;height:40px;background:#333;border-radius:8px;'
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 100, 20)
    setTimeout(() => document.body.removeChild(dragImage), 0)
  }, [])

  const handleDragEnd = useCallback(() => {
    draggedIdRef.current = null
    setDraggedId(null)
    setDropTargetId(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTargetId((prev) => (prev !== targetId ? targetId : prev))
  }, [])

  const handleDragLeave = useCallback(() => {
    setDropTargetId(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const currentDraggedId = draggedIdRef.current
    if (!currentDraggedId || currentDraggedId === targetId) return
    const params = usePluginStore.getState().plugin.parameters
    const fromIndex = params.findIndex((p) => p.id === currentDraggedId)
    const toIndex = params.findIndex((p) => p.id === targetId)
    if (fromIndex !== -1 && toIndex !== -1) {
      usePluginStore.getState().reorderParameters(fromIndex, toIndex)
    }
    draggedIdRef.current = null
    setDraggedId(null)
    setDropTargetId(null)
  }, [])

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
              <p className="text-sm">Click &quot;Add Parameter&quot; to create one</p>
            </div>
          ) : (
            parameters.map((param) => (
              <MemoizedParamRow
                key={param.id}
                param={param}
                isExpanded={expandedId === param.id}
                isSelected={selectedIds.has(param.id)}
                isDragging={draggedId === param.id}
                isDropTarget={dropTargetId === param.id}
                anyDragging={draggedId !== null}
                toggleSelect={toggleSelect}
                setExpandedId={setExpandedId}
                updateParameter={updateParameter}
                removeParameter={removeParameter}
                setCustomCode={setCustomCode}
                setSelectedIds={setSelectedIds}
                handleDragStart={handleDragStart}
                handleDragEnd={handleDragEnd}
                handleDragOver={handleDragOver}
                handleDragLeave={handleDragLeave}
                handleDrop={handleDrop}
                structNames={structNames}
                structs={structs}
                paramNameMap={paramNameMap}
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
      <Dialog
        open={presetNameOpen}
        onOpenChange={(open) => {
          if (!open) setPresetNameValue('')
          setPresetNameOpen(open)
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save Preset</DialogTitle>
            <DialogDescription>
              Enter a name for this parameter preset ({selectedParams.length} parameter
              {selectedParams.length !== 1 ? 's' : ''})
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
            <Button size="sm" disabled={!presetNameValue.trim()} onClick={handleConfirmSavePreset}>
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

/** Thin wrapper that binds param.id into stable callbacks for ParameterCard memo */
const MemoizedParamRow = memo(function MemoizedParamRow({
  param,
  isExpanded,
  isSelected,
  isDragging,
  isDropTarget,
  anyDragging,
  toggleSelect,
  setExpandedId,
  updateParameter,
  removeParameter,
  setCustomCode,
  setSelectedIds,
  handleDragStart,
  handleDragEnd,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  structNames,
  structs,
  paramNameMap,
  switches,
  variables,
  actors,
  items
}: {
  param: PluginParameter
  isExpanded: boolean
  isSelected: boolean
  isDragging: boolean
  isDropTarget: boolean
  anyDragging: boolean
  toggleSelect: (id: string) => void
  setExpandedId: React.Dispatch<React.SetStateAction<string | null>>
  updateParameter: (id: string, updates: Partial<PluginParameter>) => void
  removeParameter: (id: string) => void
  setCustomCode: (code: string) => void
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>
  handleDragStart: (e: React.DragEvent, id: string) => void
  handleDragEnd: () => void
  handleDragOver: (e: React.DragEvent, id: string) => void
  handleDragLeave: () => void
  handleDrop: (e: React.DragEvent, id: string) => void
  structNames: string[]
  structs: PluginStruct[]
  paramNameMap: ParamNameMap
  switches: { id: number; name: string }[]
  variables: { id: number; name: string }[]
  actors: { id: number; name: string }[]
  items: { id: number; name: string }[]
}) {
  const onUpdate = useCallback(
    (updates: Partial<PluginParameter>) => {
      updateParameter(param.id, updates)
      if (
        (updates.name !== undefined && updates.name !== param.name) ||
        (updates.type !== undefined && updates.type !== param.type)
      ) {
        // Read full param + customCode from store at call time (R3-04 — narrow deps)
        const store = usePluginStore.getState()
        const current = store.plugin.customCode || ''
        const fullParam = store.plugin.parameters.find((p) => p.id === param.id) ?? param
        const oldComment = generateParameterComment(fullParam)
        const newComment = generateParameterComment({ ...fullParam, ...updates } as PluginParameter)
        const updated = current.replace(oldComment, newComment)
        if (updated !== current) {
          setCustomCode(updated)
        }
      }
    },
    [param.id, param.name, param.type, updateParameter, setCustomCode]
  )

  const onDelete = useCallback(() => {
    removeParameter(param.id)
    setSelectedIds((prev) => {
      if (!prev.has(param.id)) return prev
      const next = new Set(prev)
      next.delete(param.id)
      return next
    })
  }, [param.id, removeParameter, setSelectedIds])

  const onDragStart = useCallback(
    (e: React.DragEvent) => handleDragStart(e, param.id),
    [param.id, handleDragStart]
  )

  const onDragOver = useCallback(
    (e: React.DragEvent) => handleDragOver(e, param.id),
    [param.id, handleDragOver]
  )

  const onDragLeave = useCallback(() => handleDragLeave(), [handleDragLeave])

  const onDrop = useCallback(
    (e: React.DragEvent) => handleDrop(e, param.id),
    [param.id, handleDrop]
  )

  const onToggleSelect = useCallback(() => toggleSelect(param.id), [param.id, toggleSelect])
  const onToggle = useCallback(
    () => setExpandedId((prev) => (prev === param.id ? null : param.id)),
    [param.id, setExpandedId]
  )

  return (
    <motion.div layout={anyDragging} transition={paramCardSpring}>
      <ParameterCard
        param={param}
        expanded={isExpanded}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
        onToggle={onToggle}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onDragStart={onDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        isDragging={isDragging}
        isDropTarget={isDropTarget}
        structs={structNames}
        allStructs={structs}
        paramNameMap={paramNameMap}
        switches={switches}
        variables={variables}
        actors={actors}
        items={items}
      />
    </motion.div>
  )
})

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
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  isDragging: boolean
  isDropTarget: boolean
  structs: string[]
  allStructs: PluginStruct[]
  paramNameMap: ParamNameMap
  switches: { id: number; name: string }[]
  variables: { id: number; name: string }[]
  actors: { id: number; name: string }[]
  items: { id: number; name: string }[]
}

/** Options editor that uses local state to avoid value|label being eaten on keystroke */
function OptionsEditor({
  param,
  onUpdate
}: {
  param: PluginParameter
  onUpdate: (updates: Partial<PluginParameter>) => void
}) {
  const serialize = (opts: PluginParameter['options']) =>
    opts?.map((o) => (o.value !== o.text ? `${o.value}|${o.text}` : o.text)).join('\n') || ''

  const [localText, setLocalText] = useState(() => serialize(param.options))

  // Sync from store when param or options change externally (e.g. undo, import, preset apply)
  const serializedOptions = JSON.stringify(param.options)
  useEffect(() => {
    setLocalText(serialize(param.options))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- serializedOptions tracks param.options
  }, [param.id, serializedOptions])

  const commitOptions = (text: string) => {
    const options = text
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        if (line.includes('|')) {
          const pipeIdx = line.indexOf('|')
          return {
            value: line.slice(0, pipeIdx).trim(),
            text: line.slice(pipeIdx + 1).trim() || line.slice(0, pipeIdx).trim()
          }
        }
        return { value: line.trim(), text: line.trim() }
      })
    onUpdate({ options })
  }

  return (
    <div className="space-y-2">
      <Label>Options (one per line, format: value|label or just label)</Label>
      <Textarea
        value={localText}
        onChange={(e) => {
          setLocalText(e.target.value)
          commitOptions(e.target.value)
        }}
        placeholder={'option1|Option 1\noption2|Option 2'}
        rows={4}
        className="font-mono text-sm"
      />
    </div>
  )
}

const ParameterCard = memo(function ParameterCard({
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
  onDragLeave,
  onDrop,
  isDragging,
  isDropTarget,
  structs,
  allStructs,
  paramNameMap,
  switches,
  variables,
  actors,
  items
}: ParameterCardProps) {
  const nameError = getParamNameError(param.name, paramNameMap, param.id)
  const hasAdvancedValues =
    Boolean(param.desc) ||
    (param.type === 'boolean' && (param.onLabel || param.offLabel)) ||
    (param.type === 'number' &&
      (param.min !== undefined || param.max !== undefined || param.decimals !== undefined)) ||
    ((param.type === 'file' || param.type === 'animation') && (param.dir || param.require))

  const [showAdvanced, setShowAdvanced] = useState(hasAdvancedValues)

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
  const isNumericIdType = ['icon', 'map'].includes(param.type)
  const gameDataOptions = getGameDataOptions()
  const hasProjectData = gameDataOptions.length > 0
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card transition-all',
        isDragging && 'opacity-60 shadow-lg scale-[1.02] z-10 ring-2 ring-primary/50',
        isDropTarget && !isDragging && 'border-primary border-dashed bg-primary/5'
      )}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Header */}
      <div className="flex cursor-pointer items-center gap-2 p-3" onClick={onToggle}>
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
        <GripVertical className="h-5 w-5 cursor-grab text-muted-foreground transition-colors hover:text-foreground" />
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <div className="flex-1">
          <span className="font-medium">{param.text || param.name}</span>
          <span className="ml-2 text-sm text-muted-foreground">({param.type})</span>
          {param.type === 'hidden' && (
            <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              hidden in MZ
            </span>
          )}
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
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border p-4 space-y-4">
              {/* Essential: Internal Name + Display Label */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Internal Name</Label>
                  <Input
                    value={param.name}
                    onChange={(e) => onUpdate({ name: e.target.value })}
                    placeholder="paramName"
                    className={nameError ? 'border-destructive' : ''}
                  />
                  {nameError && <p className="text-xs text-destructive">{nameError}</p>}
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

              {/* Essential: Type + Default Value */}
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
                      {PARAM_TYPE_GROUPS.map((group) => (
                        <div key={group.group}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            {group.group}
                          </div>
                          {group.types.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              <div className="flex items-baseline gap-2">
                                <span>{t.label}</span>
                                <span className="text-xs text-muted-foreground">{t.desc}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {param.type !== 'struct' && (
                  <div className="space-y-2">
                    <Label>Default Value</Label>
                    {isNumericIdType ? (
                      <Input
                        type="number"
                        value={String(param.default ?? 0)}
                        onChange={(e) => onUpdate({ default: Number(e.target.value) })}
                        placeholder={param.type === 'icon' ? 'Icon index' : 'Map ID'}
                        min={0}
                      />
                    ) : isGameDataType ? (
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
                          const val =
                            param.type === 'number' ? Number(e.target.value) : e.target.value
                          onUpdate({ default: val })
                        }}
                        type={param.type === 'number' ? 'number' : 'text'}
                        placeholder="Default value"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Essential: Select/Combo options */}
              {(param.type === 'select' || param.type === 'combo') && (
                <OptionsEditor param={param} onUpdate={onUpdate} />
              )}

              {/* Essential: Struct reference + default editor */}
              {param.type === 'struct' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Struct Type</Label>
                    <Select
                      value={param.structType || ''}
                      onValueChange={(value) => onUpdate({ structType: value, default: '' })}
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

                  {param.structType &&
                    (() => {
                      const structDef = allStructs.find((s) => s.name === param.structType)
                      if (!structDef) return null
                      return (
                        <StructDefaultEditor
                          struct={structDef}
                          value={typeof param.default === 'string' ? param.default : ''}
                          onChange={(jsonStr) => onUpdate({ default: jsonStr })}
                        />
                      )
                    })()}
                </div>
              )}

              {/* Essential: Array element type */}
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

              {/* Advanced fields toggle */}
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAdvanced ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                {showAdvanced ? 'Hide details' : 'Show details'}
                {param.desc && !showAdvanced && (
                  <span className="text-muted-foreground/60">— has description</span>
                )}
              </button>

              {/* Advanced fields */}
              {showAdvanced && (
                <>
                  {/* Description */}
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={param.desc}
                      onChange={(e) => onUpdate({ desc: e.target.value })}
                      placeholder="Help text for this parameter"
                    />
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
                          onChange={(e) =>
                            onUpdate({ min: e.target.value ? Number(e.target.value) : undefined })
                          }
                          placeholder="No min"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Max</Label>
                        <Input
                          type="number"
                          value={param.max ?? ''}
                          onChange={(e) =>
                            onUpdate({ max: e.target.value ? Number(e.target.value) : undefined })
                          }
                          placeholder="No max"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Decimals</Label>
                        <Input
                          type="number"
                          value={param.decimals ?? ''}
                          onChange={(e) =>
                            onUpdate({
                              decimals: e.target.value ? Number(e.target.value) : undefined
                            })
                          }
                          placeholder="0"
                          min={0}
                        />
                      </div>
                    </div>
                  )}

                  {/* File/Animation directory and require */}
                  {(param.type === 'file' || param.type === 'animation') && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Directory (relative to project)</Label>
                        <Input
                          value={param.dir || ''}
                          onChange={(e) => onUpdate({ dir: e.target.value })}
                          placeholder={
                            param.type === 'animation' ? 'img/animations' : 'img/pictures'
                          }
                        />
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={param.require || false}
                          onChange={(e) => onUpdate({ require: e.target.checked || undefined })}
                          className="h-4 w-4"
                        />
                        Required for deployment (@require 1)
                      </label>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})
